<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { computed, h, resolveComponent } from "vue";

interface User {
  login: string;
  followers: { totalCount: number };
  name: string | null;
  createdAt: string;
  location?: string | null;
}

type SortingState = Array<{ id: string; desc: boolean }>;

const props = defineProps<{
  users: User[];
  sorting: SortingState;
  canPrev: boolean;
  canNext: boolean;
  page: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (event: "update:sorting", value: SortingState): void;
  (event: "prev" | "next"): void;
}>();

const internalSorting = computed({
  get: () => props.sorting,
  set: value => emit("update:sorting", value),
});

const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;
const getAge = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / MS_IN_YEAR;

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

const columns = [
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
    accessorKey: "location",
    header: ({ column }) => getHeader(column, "Location"),
    cell: ({ row }) => row.original.location || "-",
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => getHeader(column, "Account Age"),
    cell: ({ row }) => `${Math.floor(getAge(row.original.createdAt))} years`,
    enableSorting: true,
  },
] satisfies TableColumn<User>[];
</script>

<template>
  <div>
    <UTable
      v-model:sorting="internalSorting"
      :data="users"
      :columns="columns"
      class="mt-6"
    />
    <div class="flex items-center justify-center gap-4 my-8">
      <UButton
        variant="soft"
        :disabled="!canPrev"
        @click="emit('prev')"
      >
        Previous
      </UButton>
      <span class="text-sm text-muted">
        Page {{ page }} of {{ totalPages }}
      </span>
      <UButton
        variant="soft"
        :disabled="!canNext"
        @click="emit('next')"
      >
        Next
      </UButton>
    </div>
  </div>
</template>
