const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testStorageUpload() {
  try {
    console.log('🔍 Testing storage bucket access...');
    
    // Test 1: List existing files
    console.log('📋 Listing existing files in bucket...');
    const { data: files, error: listError } = await supabase.storage
      .from('recipes-images')
      .list('', { limit: 5 });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }

    console.log('✅ Successfully listed files:', files?.length || 0, 'files found');
    if (files && files.length > 0) {
      console.log('📁 Sample files:', files.slice(0, 3).map(f => f.name));
    }

    // Test 2: Try to upload a small test file
    console.log('📤 Testing file upload...');
    const testContent = Buffer.from('test image content');
    const testFilename = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recipes-images')
      .upload(`test/${testFilename}`, testContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      return;
    }

    console.log('✅ Upload test successful:', uploadData.path);

    // Test 3: Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipes-images')
      .getPublicUrl(uploadData.path);

    console.log('🔗 Public URL:', publicUrl);

    // Test 4: Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('recipes-images')
      .remove([`test/${testFilename}`]);

    if (deleteError) {
      console.warn('⚠️ Failed to clean up test file:', deleteError);
    } else {
      console.log('🧹 Test file cleaned up');
    }

    console.log('✅ All storage tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testStorageUpload();






