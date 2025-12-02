import { supabaseAdmin } from '../config/supabase.js';

const username = process.env.ADMIN_EMAIL || 'agentuniver@gmail.com';

async function main() {
  try {
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      console.error('Admin not found:', error?.message || 'no record');
      process.exit(1);
    }

    console.log('Admin record:', admin);
    console.log('status:', admin.status);
  } catch (e: any) {
    console.error('Unexpected error:', e?.message || e);
    process.exit(1);
  }
}

main();

