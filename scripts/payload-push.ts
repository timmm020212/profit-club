import 'dotenv/config';

// Force-set env to skip interactive prompts
process.env.PAYLOAD_MIGRATING = 'true';

async function push() {
  const { getPayload } = await import('payload');
  const config = (await import('../payload.config')).default;

  console.log('Initializing Payload...');
  const payload = await getPayload({ config });

  console.log('Pushing schema to database...');
  // @ts-ignore - pushDevSchema is internal but works
  const { pushDevSchema } = await import('@payloadcms/drizzle');
  await pushDevSchema(payload.db as any);

  console.log('Schema pushed successfully!');
  process.exit(0);
}

push().catch((e) => {
  console.error('Error pushing schema:', e);
  process.exit(1);
});
