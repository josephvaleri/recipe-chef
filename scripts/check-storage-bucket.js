const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkAndCreateBucket() {
  try {
    console.log('🔍 Checking if recipes-images bucket exists...');
    
    // Try to list files in the bucket
    const { data, error } = await supabase.storage
      .from('recipes-images')
      .list('', { limit: 1 });

    if (error) {
      if (error.message.includes('Bucket not found')) {
        console.log('❌ Bucket "recipes-images" does not exist');
        console.log('📝 Please create the bucket manually in your Supabase dashboard:');
        console.log('   1. Go to Storage in your Supabase dashboard');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name it "recipes-images"');
        console.log('   4. Set it to public');
        console.log('   5. Click "Create bucket"');
        return false;
      } else {
        console.error('Error checking bucket:', error);
        return false;
      }
    } else {
      console.log('✅ Bucket "recipes-images" exists and is accessible');
      return true;
    }
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

checkAndCreateBucket();

