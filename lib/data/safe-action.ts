// lib/data/safe-action.ts

import { getSession } from "@/lib/auth";
import { z, ZodSchema } from "zod";

/**
 * Custom error class for action errors
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Use this function to validate input using a Zod schema.
 */
export async function validateInput<T>(
  schema: ZodSchema<T>,
  input: unknown
): Promise<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ActionError(
        `Validation Errors: ${error.errors.map((e) => e.message).join(", ")}`
      );
    }
    throw error;
  }
}

/**
 * Use this function to authenticate the user.
 */
export async function authenticateUser(): Promise<string> {
  const session = await getSession();
  const userId = session?.user?.id;

  if (!session || !userId) {
    throw new ActionError("You are not authorized for this action.");
  }

  return userId;
}

/**
 * Parses the action error object and returns a formatted error message.
 *
 * @param error - The action error object.
 * @returns The formatted error message.
 */
export const parseActionError = (error: any): string => {
  let errorMessage = "";

  if (error instanceof ActionError) {
    errorMessage += `Error: ${error.message}\n`;
  } else if (error instanceof z.ZodError) {
    errorMessage += `Validation Errors: ${error.errors
      .map((e) => e.message)
      .join(", ")}\n`;
  } else {
    errorMessage += `Server Error: ${
      error.message || "An unexpected error occurred."
    }\n`;
  }

  return errorMessage.trim();
};
