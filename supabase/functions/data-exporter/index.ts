
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

console.log('Simple test function initialized.');

serve(async (req) => {
  console.log('Test function was called! Path: ', req.url);

  const data = {
    message: "SUCCESS: The data-exporter function is live!",
    details: "The URL is correct and the function is deployed.",
    request_url: req.url,
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});

