import { OpenRouter } from "@openrouter/sdk";
import { createClient } from "./supabase/server";

// Initialize OpenRouter provider
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const nameProject = async (projectId: string, prompt: string) => {
  const supabase = await createClient();

  const result = await openRouter.chat.send({
    model: "openai/gpt-5-nano",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that names projects into a few words (max 5 words). You will be given a prompt used to generate a project, and you will need to return the name of the project. Return solely the name of the project, no other text or explanation.",
      },
      {
        role: "user",
        content: `<prompt>\n${prompt.trim()}\n</prompt>`,
      },
    ],
  });

  const projectName = result.choices[0].message.content as string;

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      name: projectName,
    })
    .eq("id", projectId);
  if (updateError) {
    throw new Error("Failed to update project name");
  }

  return projectName;
};
