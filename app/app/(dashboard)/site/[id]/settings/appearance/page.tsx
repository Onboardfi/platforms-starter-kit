import Form from "@/components/form";
import { updateSite } from "@/lib/actions";
import db from "@/lib/db";
import { notFound } from "next/navigation";
import { sites } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { SelectSite } from "@/lib/schema";

export default async function SiteSettingsAppearance({
  params,
}: {
  params: { id: string };
}) {
  const site = await db.query.sites.findFirst({
    where: eq(sites.id, decodeURIComponent(params.id)),
    with: {
      organization: true,
      creator: true
    }
  });

  // Handle null case upfront
  if (!site) {
    notFound();
  }

  // Create a type-safe site object that matches SelectSite
  const safeSite: SelectSite = {
    ...site,
    organization: site.organization,
    creator: site.creator,
  };

  return (
    <div className="flex flex-col space-y-6">
      <Form
        title="Thumbnail image"
        description="The thumbnail image for your site. Accepted formats: .png, .jpg, .jpeg"
        helpText="Max file size 50MB. Recommended size 1200x630."
        inputAttrs={{
          name: "image",
          type: "file",
          defaultValue: site.image || "",
        }}
        handleSubmit={(formData: FormData) => updateSite(formData, safeSite, "image")}
      />
      <Form
        title="Logo"
        description="The logo for your site. Accepted formats: .png, .jpg, .jpeg"
        helpText="Max file size 50MB. Recommended size 400x400."
        inputAttrs={{
          name: "logo",
          type: "file",
          defaultValue: site.logo || "",
        }}
        handleSubmit={(formData: FormData) => updateSite(formData, safeSite, "logo")}
      />
      <Form
        title="Font"
        description="The font for the heading text your site."
        helpText="Please select a font."
        inputAttrs={{
          name: "font",
          type: "select",
          defaultValue: site.font,
        }}
        handleSubmit={(formData: FormData) => updateSite(formData, safeSite, "font")}
      />
      <Form
        title="404 Page Message"
        description="Message to be displayed on the 404 page."
        helpText="Please use 240 characters maximum."
        inputAttrs={{
          name: "message404",
          type: "text",
          defaultValue: site.message404 || "Blimey! You've found a page that doesn't exist.",
          placeholder: "Blimey! You've found a page that doesn't exist.",
          maxLength: 240,
        }}
        handleSubmit={(formData: FormData) => updateSite(formData, safeSite, "message404")}
      />
    </div>
  );
}