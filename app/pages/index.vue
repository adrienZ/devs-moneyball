<script setup lang="ts">
import { useAsyncData, useRequestEvent } from "nuxt/app";
import { ref, computed, h, resolveComponent } from "vue";
import { UFormField, UInputNumber, USlider, USelect, UProgress, UAlert } from "#components";

import type { TableColumn } from "@nuxt/ui";
import { getUserLocation } from "~~/server/utils/user-location";

interface User {
  login: string;
  followers: { totalCount: number };
  name: string | null;
  createdAt: string;
}

const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;
const getAge = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / MS_IN_YEAR;

const minFollowers = ref<number | undefined>();
const maxFollowers = ref<number | undefined>();
const minAge = ref<number | undefined>();
const maxAge = ref<number | undefined>();
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
const { data: location } = await useAsyncData("user-location", () => getUserLocation(serverEvent!));

const { data: users, pending: loading, error } = await useAsyncData("list", () => $fetch("/api/github/popular-users", {
  query: {
    minFollowers: minFollowers.value,
    maxFollowers: maxFollowers.value,
    minAge: minAge.value,
    maxAge: maxAge.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    location: location.value?.region,
  },
}), {
  watch: [minFollowers, maxFollowers, minAge, maxAge, sortField, sortOrder],
},
);

const safeUsers = computed(() => users.value || []);

const UButton = resolveComponent("UButton");

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
function getHeader(column: Parameters<TableColumn<User>["header"]>["0"]["column"], label: string) {
  const isSorted = column.getIsSorted();
  return h(UButton, {
    "color": "neutral",
    "variant": "ghost",
    label,
    "icon": isSorted
      ? isSorted === "asc"
        ? "i-lucide-arrow-up-narrow-wide"
        : "i-lucide-arrow-down-wide-narrow"
      : "i-lucide-arrow-up-down",
    "class": "-mx-2.5",
    "aria-label": `Sort by ${label}`,
    "onClick": () => column.toggleSorting(isSorted === "asc"),
  });
}

const columns: TableColumn<User>[] = [
  {
    accessorKey: "login",
    header: ({ column }) => getHeader(column, "User"),
    cell: ({ row }) =>
      h(
        "a",
        { href: `/dev/${row.original.login}`, class: "flex items-center gap-1 text-primary underline" },
        [
          h(resolveComponent("UAvatar"), {
            src: `https://github.com/${row.original.login}.png`,
            alt: row.original.login,
            size: "sm",
          }),
          row.original.login,
        ],
      ),
    enableSorting: true,
  },
  {
    accessorKey: "followers.totalCount",
    header: ({ column }) => getHeader(column, "Followers"),
    cell: ({ row }) => row.original.followers.totalCount,
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => getHeader(column, "Account Age"),
    cell: ({ row }) => `${Math.floor(getAge(row.original.createdAt))} years`,
    enableSorting: true,
  },
];

const sorting = ref([]);
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
      Top 50 Users in {{ location?.region ?? "the World" }}
    </h2>
    <div class="filters grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-elevated rounded-xl shadow">
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
        label="Min Age (years)"
        class="col-span-1"
      >
        <UInputNumber
          v-model="minAge"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Max Age (years)"
        class="col-span-1"
      >
        <UInputNumber
          v-model="maxAge"
          class="w-full"
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
    <UTable
      v-model:sorting="sorting"
      :data="safeUsers"
      :columns="columns"
      class="mt-6"
    />
  </div>
</template>
