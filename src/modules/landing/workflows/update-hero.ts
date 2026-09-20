import { HeroContent } from "../types.ts";
import { landingServiceInstance } from "../service.ts";

/**
 * Medusa Workflow Step for validating and saving Hero Content
 */
export async function updateHeroStep(input: Partial<HeroContent>): Promise<HeroContent> {
  if (input.title && input.title.trim().length === 0) {
    throw new Error("El título del Hero no puede estar vacío.");
  }
  return await landingServiceInstance.updateHero(input);
}

/**
 * Medusa Workflow for updating Landing Hero
 */
export async function updateHeroWorkflow(input: Partial<HeroContent>) {
  const updatedHero = await updateHeroStep(input);
  return {
    success: true,
    hero: updatedHero,
  };
}
