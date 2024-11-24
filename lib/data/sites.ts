// lib/data/sites.ts

import { sites } from "../schema";
import { eq, desc, sql, and, or, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";
import { createId } from '@paralleldrive/cuid2';
import { getSession } from '@/lib/auth';

/**
 * Creates a new site in the database
 */
const createSiteSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  logo: z.string().optional(),
  font: z.string().optional(),
  image: z.string().optional(),
  imageBlurhash: z.string().optional(),
  subdomain: z.string(),
  customDomain: z.string().optional(),
  message404: z.string().optional(),
});

export async function createSite(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const session = await getSession();
  
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  const parsedInput = await validateInput(createSiteSchema, input);

  const {
    name,
    description,
    logo,
    font = "font-cal",
    image,
    imageBlurhash,
    subdomain,
    customDomain,
    message404 = "Blimey! This page does not exist.",
  } = parsedInput;

  // Check if subdomain or customDomain already exists
  const existingSite = await db
    .select()
    .from(sites)
    .where(
      or(
        eq(sites.subdomain, subdomain),
        customDomain ? eq(sites.customDomain, customDomain) : sql`false`
      )
    )
    .limit(1);

  if (existingSite.length) {
    throw new Error("Subdomain or custom domain is already in use.");
  }

  // Create the site
  const [newSite] = await db
    .insert(sites)
    .values({
      id: createId(),
      name,
      description,
      logo,
      font,
      image,
      imageBlurhash,
      subdomain,
      customDomain,
      message404,
      organizationId: session.organizationId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ siteId: sites.id });

  return newSite.siteId;
}

/**
 * Gets all sites for a user's organization
 */
export async function getSites() {
  "use server";

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  const sitesData = await db.query.sites.findMany({
    where: eq(sites.organizationId, session.organizationId),
    with: {
      organization: true,
      creator: true
    },
    orderBy: [desc(sites.createdAt)]
  });

  const data = sitesData.map((site) => ({
    id: site.id,
    name: site.name,
    description: site.description,
    logo: site.logo,
    font: site.font,
    image: site.image,
    imageBlurhash: site.imageBlurhash,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    message404: site.message404,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    organizationId: site.organizationId,
    createdBy: site.createdBy,
    organization: site.organization,
    creator: site.creator
  }));

  return { data };
}

/**
 * Get site data for one specific site
 */
const getSiteDataSchema = z.object({ id: z.string() });

export async function getSiteData(input: unknown) {
  "use server";

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  const parsedInput = await validateInput(getSiteDataSchema, input);
  const { id } = parsedInput;

  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, id),
      eq(sites.organizationId, session.organizationId)
    ),
    with: {
      organization: true,
      creator: true
    }
  });

  if (!site) {
    throw new Error("Site not found or unauthorized");
  }

  return {
    id: site.id,
    name: site.name,
    description: site.description,
    logo: site.logo,
    font: site.font,
    image: site.image,
    imageBlurhash: site.imageBlurhash,
    subdomain: site.subdomain,
    customDomain: site.customDomain,
    message404: site.message404,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    organizationId: site.organizationId,
    createdBy: site.createdBy,
    organization: site.organization,
    creator: site.creator
  };
}

/**
 * Delete a site by ID
 */
const deleteSiteSchema = z.object({ id: z.string() });

export async function deleteSite(input: unknown) {
  "use server";

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  const parsedInput = await validateInput(deleteSiteSchema, input);
  const { id } = parsedInput;

  const site = await db.query.sites.findFirst({
    where: and(
      eq(sites.id, id),
      eq(sites.organizationId, session.organizationId)
    )
  });

  if (!site) {
    throw new Error("Site not found or unauthorized");
  }

  await db.delete(sites).where(
    and(
      eq(sites.id, id),
      eq(sites.organizationId, session.organizationId)
    )
  );

  return { success: true };
}

/**
 * Get site counts over time for the dashboard chart
 */
export async function getSiteCounts(startDate?: Date, endDate?: Date) {
  "use server";

  const session = await getSession();
  if (!session?.organizationId) {
    throw new Error("Organization context required");
  }

  // If no dates provided, default to all time
  const dateFilter = startDate && endDate 
    ? and(
        eq(sites.organizationId, session.organizationId),
        gte(sites.createdAt, startDate),
        lte(sites.createdAt, endDate)
      )
    : eq(sites.organizationId, session.organizationId);

  const siteCounts = await db
    .select({
      date: sql<string>`DATE(sites."createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(sites)
    .where(dateFilter)
    .groupBy(sql`DATE(sites."createdAt")`)
    .orderBy(sql`DATE(sites."createdAt")`);

  const dateMap = new Map<string, number>();
  siteCounts.forEach((item) => {
    const dateString = item.date;
    dateMap.set(dateString, Number(item.count));
  });

  const days = startDate && endDate 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const chartData = [];
  for (let i = 0; i <= days; i++) {
    const date = startDate 
      ? new Date(startDate.getTime() + i * (1000 * 60 * 60 * 24))
      : new Date(Date.now() - (days - i) * (1000 * 60 * 60 * 24));
    
    const dateString = date.toISOString().split('T')[0];
    chartData.push({
      date: dateString,
      sites: dateMap.get(dateString) || 0,
    });
  }

  return { data: chartData };
}