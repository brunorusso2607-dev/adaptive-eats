// Teste de checkout via JavaScript
fetch('https://onzdkpqtzfxzcdyxczkn.supabase.co/functions/v1/create-test-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4Y2R5eGN6a24iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzAzNzU4MSwiZXhwIjoyMDkyNjEzNTgxfQ.5vEaLJ5h5hQ2b2pQ3L6Z3X9w5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Success:', data);
  if (data.checkout_url) {
    window.open(data.checkout_url, '_blank');
  }
})
.catch(error => {
  console.error('Error:', error);
});
