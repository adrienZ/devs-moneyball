import { defineNuxtModule } from "nuxt/kit";
import { addCustomTab, startSubprocess } from "@nuxt/devtools-kit";

export default defineNuxtModule({
  meta: {
    name: "pg-boss-dashboard",
  },
  setup(_options, nuxt) {
    if (!nuxt.options.dev && !process.env.DATABASE_URL) {
      return;
    }

    const connectionString
      = process.env.PGBOSS_DATABASE_URL ?? process.env.DATABASE_URL;

    if (!connectionString) {
      return;
    }

    startSubprocess(
      {
        command: "npx",
        args: ["pg-boss-admin-dashboard", "--no-browser"],
        env: {
          ...process.env,
          PGBOSS_DATABASE_URL: connectionString,
          PGBOSS_NO_BROWSER: "true",
        },
      },
      {
        id: "nuxt-pg-boss-admin-dashboard",
        name: "pg-boss Dashboard",
      },
    );

    addCustomTab({
      name: "pg-boss-dashboard",
      title: "pg-boss Dashboard",
      icon: "ph:queue",
      view: {
        type: "iframe",
        src: `http://localhost:8671`,
      },
    });
  },
});
