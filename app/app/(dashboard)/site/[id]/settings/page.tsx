// app/(dashboard)/site/[id]/settings/page.tsx
import { updateSite } from "@/lib/actions";
import db from "@/lib/db";
import DeleteSiteForm from "@/components/form/delete-site-form";
import { notFound } from "next/navigation";
import { sites } from "@/lib/schema";
import { DreamForm, DreamInput } from "@/components/form/dream-form";

// Create server actions for each form
async function updateSiteName(formData: FormData) {
  "use server";
  const site = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, formData.get("siteId") as string),
    with: {
      organization: true,
      creator: true
    }
  });
  if (!site) return;
  return updateSite(formData, site, "name");
}

async function updateSiteDescription(formData: FormData) {
  "use server";
  const site = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, formData.get("siteId") as string),
    with: {
      organization: true,
      creator: true
    }
  });
  if (!site) return;
  return updateSite(formData, site, "description");
}

export default async function SiteSettingsIndex({
  params,
}: {
  params: { id: string };
}) {
  const site = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, decodeURIComponent(params.id)),
    with: {
      organization: true,
      creator: true,
      posts: true,
      agents: true
    }
  });

  if (!site) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Site Name Form */}
      <DreamForm
        title="Site Name"
        description="The name of your site. This will be used as the meta title on Google as well."
        helpText="Please use 32 characters maximum."
        formAction={updateSiteName}
      >
        <DreamInput
          name="name"
          defaultValue={site.name}
          placeholder="My Awesome Site"
          maxLength={32}
        />
        <input type="hidden" name="siteId" value={site.id} />
      </DreamForm>

      {/* Site Description Form */}
      <DreamForm
        title="Site Description"
        description="The description of your site. This will be used as the meta description on Google as well."
        helpText="Include SEO-optimized keywords that you want to rank for."
        formAction={updateSiteDescription}
      >
        <DreamInput
          name="description"
          defaultValue={site.description}
          placeholder="A blog about really interesting things."
        />
        <input type="hidden" name="siteId" value={site.id} />
      </DreamForm>

      {/* Delete Site Form */}
      <div className="pt-6 border-t border-white/[0.08]">
        <DeleteSiteForm site={site} />
      </div>
    </div>
  );
}