// lib/data/sites.ts

import { sites } from "../schema";
import { eq, desc, sql, and, or, gte, lte } from "drizzle-orm";
import db from "../db";
import { z } from "zod";
import { authenticateUser, validateInput } from "./safe-action";
import crypto from "crypto";

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
      id: crypto.randomUUID(), // Use any ID generation method you prefer
      name,
      description,
      logo,
      font,
      image,
      imageBlurhash,
      subdomain,
      customDomain,
      message404,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ siteId: sites.id });

  return newSite.siteId;
}

/**
 * Gets all sites for a user
 */
export async function getSites() {
  "use server";

  const userId = await authenticateUser();

  const sitesData = await db
    .select()
    .from(sites)
    .where(eq(sites.userId, userId))
    .orderBy(desc(sites.createdAt));

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
    userId: site.userId,
  }));

  return { data };
}

/**
 * Get site data for one specific site
 */
const getSiteDataSchema = z.object({ id: z.string() });

export async function getSiteData(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(getSiteDataSchema, input);
  const { id } = parsedInput;

  const siteWithUser = await db
    .select({ siteUserId: sites.userId })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);

  if (!siteWithUser.length || siteWithUser[0].siteUserId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  const siteData = await db
    .select()
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);

  if (!siteData.length) {
    throw new Error("Site not found.");
  }

  const site = siteData[0];

  const data = {
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
    userId: site.userId,
  };

  return data;
}

/**
 * Delete a site by ID
 */
const deleteSiteSchema = z.object({ id: z.string() });

export async function deleteSite(input: unknown) {
  "use server";

  const userId = await authenticateUser();
  const parsedInput = await validateInput(deleteSiteSchema, input);
  const { id } = parsedInput;

  const siteWithUser = await db
    .select({ siteUserId: sites.userId })
    .from(sites)
    .where(eq(sites.id, id));

  if (!siteWithUser.length || siteWithUser[0].siteUserId !== userId) {
    throw new Error("You are not authorized for this action.");
  }

  await db.delete(sites).where(eq(sites.id, id));
  // Optionally revalidate paths if you're using caching
  // revalidatePath("/sites");

  return { success: true };
}

/**
 * Get site counts over time for the dashboard chart
 */
export async function getSiteCounts() {
  "use server";

  const userId = await authenticateUser();

  // Define the date range (e.g., past 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // Past 30 days including today

  // Fetch site counts grouped by date
  const siteCounts = await db
    .select({
      date: sql<string>`DATE("createdAt")`.as("date"),
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(sites)
    .where(
      and(
        eq(sites.userId, userId),
        gte(sites.createdAt, startDate),
        lte(sites.createdAt, endDate)
      )
    )
    .groupBy(sql`DATE("createdAt")`)
    .orderBy(sql`DATE("createdAt")`);

  // Prepare data for the chart
  const chartData = [];

  // Create a date map for quick lookup
  const dateMap = new Map<string, number>();
  siteCounts.forEach((item) => {
    const dateString = item.date; // Use item.date directly
    dateMap.set(dateString, Number(item.count));
  });

  // Fill in missing dates with zero counts
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateString = date.toISOString().split("T")[0]; // 'YYYY-MM-DD' format
    chartData.push({
      date: dateString,
      sites: dateMap.get(dateString) || 0,
    });
  }

  return { data: chartData };
}