import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  const build =
    process.env.VERCEL_DEPLOYMENT_ID ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "dev";

  return Response.json({ version: packageJson.version, build });
}
