<script setup lang="ts">
import { getUserConfig } from "~~/server/utils/user-location";
import { useAsyncData, useRequestEvent } from "nuxt/app";
import { ref, computed, watch } from "vue";
import { useDebounceFn, useUrlSearchParams } from "@vueuse/core";
import { UFormField, UInputNumber, USlider, USelect, UProgress, UAlert, UInputMenu } from "#components";
import UsersTable from "~/components/UsersTable.vue";
import type { LocationSuggestion } from "~~/server/services/locationService";
import { useRoute } from "vue-router";
import type { LanguageListEntry } from "~~/server/api/languages";
import type { InternalApi } from "nitropack/types";

// import CriteriaPicker from "~/components/CriteriaPicker.vue";

const params = useUrlSearchParams("history");
const route = useRoute();

const {
  locationInput,
  locationOptions, debouncedKeystoreCallback,
  query,
  handleLocationValueChange,
  searchTerm,
} = useLocationSearch();

const { languagesList, selectedLanguages, handleLanguageValueChange } = useLanguageSearch();

// "inlined composable" https://www.youtube.com/watch?v=iKaDFAxzJyw&t=825s
function useLocationSearch() {
  const locationInput = ref<LocationSuggestion>();
  const locationOptions = ref<LocationSuggestion[]>([]);
  const searchTerm = ref("");

  // use generic typing instead of runtime to avoid https://github.com/nitrojs/nitro/issues/470
  const query = useAsyncData("location-query", () => {
    return $fetch<LocationSuggestion[]>("/api/github/location-search", {
      query: { q: searchTerm.value },
    });
  }, {
    lazy: true,
    immediate: false,
  });

  async function handleLocationKeystroke(queryString: string) {
    searchTerm.value = queryString;

    if (queryString.length < 2) {
      locationOptions.value = [];
      return;
    }

    await query.execute();

    if (query.error.value) {
      // eslint-disable-next-line no-console
      console.error("Error fetching location suggestions:", query.error.value);
      locationOptions.value = [];
      return;
    }

    locationOptions.value = (query.data.value ?? []);
  }

  const debouncedKeystoreCallback = useDebounceFn(handleLocationKeystroke, 1000);

  function handleLocationValueChange() {
    if (locationInput.value) {
      params.location = locationInput.value.name;
    }
  }

  function init() {
    const initialValue = import.meta.server ? route.query.location?.toString() : params.location?.toString();
    if (initialValue) {
      const fakeLocationPrefill = {
        name: initialValue,
        label: initialValue,
        country: "",
        city: "",
        state: "",
        lat: NaN,
        lon: NaN,
      };

      locationOptions.value = [fakeLocationPrefill];
      locationInput.value = fakeLocationPrefill;
    }
  }

  init();

  return {
    locationInput,
    locationOptions,
    query,
    debouncedKeystoreCallback,
    handleLocationValueChange,
    searchTerm,
  };
}

function useLanguageSearch() {
  const selectedLanguages = ref<string[]>([]);

  const query = useAsyncData("language-query", () => {
    return $fetch<LanguageListEntry[]>("/api/languages");
  }, {
    transform: list => list.map(lang => lang.label),
  });

  function handleLanguageValueChange() {
    if (selectedLanguages.value.length > 0) {
      params.languages = selectedLanguages.value.join(",");
    }
    else {
      delete params.languages;
    }
  }

  function init() {
    const initialValue = import.meta.server ? route.query.languages?.toString() : params.languages?.toString();
    if (initialValue) {
      selectedLanguages.value = initialValue.split(",").map(lang => lang.trim());
    }
  }

  init();

  return {
    selectedLanguages,
    handleLanguageValueChange,
    languagesList: query.data,
    query,
  };
}

interface User {
  login: string;
  followers: { totalCount: number };
  name: string | null;
  createdAt: string;
  location?: string | null;
}

const minFollowers = ref<number | undefined>();
const maxFollowers = ref<number | undefined>();

// Calculate max possible age (current year - 2008)
const currentYear = new Date().getFullYear();
const minAccountYear = 2008;
const maxPossibleAge = currentYear - minAccountYear;
const minAge = ref<number>(0);
const maxAge = ref<number>(maxPossibleAge);

const ageOptions = Array.from({ length: maxPossibleAge + 1 }, (_, i) => ({
  label: `${i}`,
  value: i,
}));

const minAgeOptions = computed(() =>
  ageOptions.map(opt => ({
    ...opt,
    disabled: opt.value > maxAge.value,
  })),
);

const maxAgeOptions = computed(() =>
  ageOptions.map(opt => ({
    ...opt,
    disabled: opt.value < minAge.value,
  })),
);

// Ensure minAge <= maxAge and maxAge >= minAge
watch(minAge, (newMin) => {
  if (newMin > maxAge.value) {
    maxAge.value = newMin;
  }
});
watch(maxAge, (newMax) => {
  if (newMax < minAge.value) {
    minAge.value = newMax;
  }
});
const sortField = ref<"followers" | "age">("followers");
const sortOrder = ref<"asc" | "desc">("desc");

const sortFieldOptions = [
  { label: "Followers", value: "followers" },
  { label: "Account Age", value: "age" },
];
const sortOrderOptions = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

const serverEvent = useRequestEvent();

// Pagination state
const page = ref(1);
const pageSize = ref(20);
const after = ref<string | null>(null);
const cursorStack = ref<Array<string | null>>([]);

const { data: userConfig } = await useAsyncData("user-config", async () => {
  if (import.meta.server && serverEvent) {
    return getUserConfig(serverEvent);
  }
  return undefined;
}, {
  server: true,
  default: () => undefined,
});
const queryLocation = computed(() => locationInput.value?.name || userConfig.value?.country);

const { data: paginated, pending: loading, error } = await useAsyncData("list", () => $fetch<InternalApi["/api/github/popular-users"]["get"]>("/api/github/popular-users", {
  query: {
    minFollowers: minFollowers.value,
    maxFollowers: maxFollowers.value,
    minAge: minAge.value,
    maxAge: maxAge.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    location: queryLocation.value,
    languages: selectedLanguages.value.join(","),
    after: after.value ?? undefined,
    pageSize: pageSize.value,
  },
}), {
  watch: [minFollowers, maxFollowers, minAge, maxAge, sortField, sortOrder, queryLocation, selectedLanguages, after, pageSize],
});

const users = computed(() => (paginated.value?.users ?? []) as User[]);
const pageInfo = computed(() => paginated.value?.pageInfo);
const totalPages = computed(() => {
  const total = paginated.value?.total ?? 0;
  return Math.max(1, Math.ceil(total / pageSize.value));
});
const canPrev = computed(() => cursorStack.value.length > 0);
const canNext = computed(() => pageInfo.value?.hasNextPage ?? false);

watch([minFollowers, maxFollowers, minAge, maxAge, sortField, sortOrder, queryLocation, selectedLanguages, pageSize], () => {
  after.value = null;
  cursorStack.value = [];
  page.value = 1;
});

watch(userConfig, (newConfig) => {
  if (newConfig?.country) {
    const location: LocationSuggestion = {
      name: newConfig.country,
      label: newConfig.country,
      country: newConfig.country,
      city: newConfig.city,
      state: newConfig.region_name,
      lat: newConfig.latitude,
      lon: newConfig.longitude,
    };

    locationInput.value = location;
    locationOptions.value = [location];
  }
}, { immediate: true, deep: true });

const sorting = ref([]);

function goNext() {
  if (!pageInfo.value?.endCursor) return;
  cursorStack.value.push(after.value ?? null);
  after.value = pageInfo.value.endCursor;
  page.value += 1;
}

function goPrev() {
  if (cursorStack.value.length === 0) return;
  after.value = cursorStack.value.pop() ?? null;
  page.value = Math.max(1, page.value - 1);
}
</script>

<template>
  <div>
    <UProgress
      v-if="loading"
      class="mb-4"
    />
    <UAlert
      v-if="error"
      color="error"
      :title="`Error: ${error.message}`"
      class="mb-4"
    />
    <h2 class="text-3xl font-bold py-8">
      Top 50 Users in {{ queryLocation || "the World" }}
    </h2>

    <!-- <CriteriaPicker /> -->

    <div class="filters grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-elevated rounded-xl shadow">
      <UFormField
        label="Location"
        class="col-span-2 md:col-span-1"
      >
        <UInputMenu
          v-model="locationInput"
          :searchTerm="searchTerm"
          :items="locationOptions"
          :loading="query.status.value === 'pending'"
          placeholder="Type a city, state, or country..."
          clearable
          @update:searchTerm="debouncedKeystoreCallback"
          @update:modelValue="handleLocationValueChange"
        />
      </UFormField>
      <UFormField
        v-if="languagesList"
        label="Languages"
        class="col-span-2 md:col-span-1"
      >
        <UInputMenu
          v-model="selectedLanguages"
          :items="languagesList"
          placeholder="PHP, JavaScript, Python..."
          clearable
          multiple
          @update:modelValue="handleLanguageValueChange"
        />
      </UFormField>
      <UFormField
        :label="`Min Followers: ${minFollowers ?? 0}`"
        class="col-span-2 md:col-span-1"
      >
        <USlider
          v-model="minFollowers"
          :min="0"
          :max="100000"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Max Followers"
        class="col-span-2 md:col-span-1"
      >
        <UInputNumber
          v-model="maxFollowers"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Min Age"
        class="col-span-1"
      >
        <USelect
          v-model="minAge"
          :items="minAgeOptions"
          class="w-full"
          clearable
        />
      </UFormField>
      <UFormField
        label="Max Age"
        class="col-span-1"
      >
        <USelect
          v-model="maxAge"
          :items="maxAgeOptions"
          class="w-full"
          clearable
        />
      </UFormField>
      <UFormField
        label="Sort By"
        class="col-span-1"
      >
        <USelect
          v-model="sortField"
          :options="sortFieldOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Order"
        class="col-span-1"
      >
        <USelect
          v-model="sortOrder"
          :options="sortOrderOptions"
          class="w-full"
        />
      </UFormField>
    </div>
    <UsersTable
      v-model:sorting="sorting"
      :users="users"
      :canPrev="canPrev"
      :canNext="canNext"
      :page="page"
      :totalPages="totalPages"
      @prev="goPrev"
      @next="goNext"
    />
  </div>
</template>
