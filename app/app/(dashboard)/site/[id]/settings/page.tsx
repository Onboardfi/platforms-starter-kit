// app/(dashboard)/site/[id]/settings/page.tsx
import { updateSite } from "@/lib/actions";
import db from "@/lib/db";
import DeleteSiteForm from "@/components/form/delete-site-form";

async function createFormAction(formData: FormData) {
  "use server";
  
  const id = formData.get("id") as string;
  const key = formData.get("key") as string;
  return updateSite(formData, id, key);
}

// Dream UI Form Component
function DreamForm({
  title,
  description,
  helpText,
  children,
}: {
  title: string;
  description: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-neutral-800/50 backdrop-blur-md shadow-dream shine">
      {/* Gradient Border Effect */}
      <div className="absolute inset-[0] rounded-[inherit] [border:1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[320px] after:animate-border-beam after:[animation-delay:0s] after:[background:linear-gradient(to_left,#aaa,transparent,transparent)] after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_200px)]" />
      
      <div className="relative p-6">
        <div className="mb-6">
          <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
          <p className="text-sm text-neutral-400">{description}</p>
        </div>

        <form action={createFormAction} className="space-y-6">
          {children}
          
          {helpText && (
            <p className="text-xs text-neutral-500">{helpText}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="
                px-4 py-2.5 rounded-xl 
                bg-gradient-to-r from-dream-purple/50 to-dream-cyan/50 
                text-white text-sm 
                hover:brightness-110 
                transition-all duration-300 
                shine shadow-dream
                group relative overflow-hidden
              "
            >
              <span className="relative z-10">Save Changes</span>
              <div className="absolute inset-0 bg-gradient-to-r from-dream-purple/20 to-dream-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Dream UI Input Component (rest remains the same)
function DreamInput({
  type = "text",
  name,
  defaultValue,
  placeholder,
  maxLength,
}: {
  type?: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="relative group">
      <input
        type={type}
        name={name}
        defaultValue={defaultValue || ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className="
          w-full px-4 py-2.5 
          bg-neutral-900/50 
          text-white 
          border border-white/[0.08] 
          rounded-xl 
          transition-all duration-300 
          placeholder:text-neutral-500
          backdrop-blur-md
          hover:border-white/20
          focus:border-dream-purple/50 
          focus:ring-dream-purple/20
          focus:translate-y-[-1px]
          relative z-10
        "
      />
      <div className="
        absolute inset-0 
        rounded-xl 
        bg-gradient-to-r from-dream-purple/20 to-dream-cyan/20 
        opacity-0 group-hover:opacity-100 
        transition-opacity duration-300 
        -z-10
      " />
    </div>
  );
}

export default async function SiteSettingsIndex({
  params,
}: {
  params: { id: string };
}) {
  const data = await db.query.sites.findFirst({
    where: (sites, { eq }) => eq(sites.id, decodeURIComponent(params.id)),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Site Name Form */}
      <DreamForm
        title="Site Name"
        description="The name of your site. This will be used as the meta title on Google as well."
        helpText="Please use 32 characters maximum."
      >
        <DreamInput
          name="name"
          defaultValue={data?.name}
          placeholder="My Awesome Site"
          maxLength={32}
        />
        <input type="hidden" name="id" value={params.id} />
        <input type="hidden" name="key" value="name" />
      </DreamForm>

      {/* Site Description Form */}
      <DreamForm
        title="Site Description"
        description="The description of your site. This will be used as the meta description on Google as well."
        helpText="Include SEO-optimized keywords that you want to rank for."
      >
        <DreamInput
          name="description"
          defaultValue={data?.description}
          placeholder="A blog about really interesting things."
        />
        <input type="hidden" name="id" value={params.id} />
        <input type="hidden" name="key" value="description" />
      </DreamForm>

      {/* Delete Site Form */}
      <div className="pt-6 border-t border-white/[0.08]">
        <DeleteSiteForm siteName={data?.name || ''} />
      </div>
    </div>
  );
}