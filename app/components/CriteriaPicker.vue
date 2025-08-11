<script setup lang="ts">
import { UModal, UButton, USelect, UForm } from "#components";
import { reactive } from "vue";
import type { FormSubmitEvent } from "@nuxt/ui";
import z from "zod";
import { useToast } from "#ui/composables/useToast";

const operators = [
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: "=", value: "=" },
  { label: "contains", value: "contains" },
];

const form = reactive<Partial<Schema>>({
  title: "",
  name: "",
  operator: undefined,
  value: "",
});

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  name: z.string().min(1, "Name is required"),
  operator: z.enum([">", "<", "=", "contains"], {
    message: "Operator is required",
  }),
  value: z.union([
    z.string().min(1, "Value is required"),
    z.number(),
  ]),
});
type Schema = z.output<typeof schema>;

const toast = useToast();
async function onSubmit(_event: FormSubmitEvent<Schema>) {
  toast.add({ title: "Success", description: "The form has been submitted.", color: "success" });
}
</script>

<template>
  <UModal>
    <UButton
      label="Create criteria"
      color="neutral"
      variant="subtle"
    />

    <template #body>
      <UForm
        id="criteria-form"
        class="space-y-4"
        :state="form"
        :schema="schema"
        @submit="onSubmit"
      >
        <UFormField
          label="Criteria Title"
          name="title"
        >
          <UInput v-model="form.title" />
        </UFormField>

        <UFormField
          label="Criteria Name"
          name="name"
        >
          <UInput v-model="form.name" />
        </UFormField>

        <UFormField
          label="Criteria Operator"
          name="operator"
        >
          <USelect
            v-model="form.operator"
            :items="operators"
            label="Operator"
            placeholder="Select operator"
          />
        </UFormField>

        <UFormField
          label="Criteria Value"
          name="value"
        >
          <UInput v-model="form.value" />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton
          color="error"
          variant="ghost"
          @click="close"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          type="submit"
          form="criteria-form"
        >
          Create
        </UButton>
      </div>
    </template>
  </UModal>
</template>
