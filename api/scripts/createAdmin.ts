import { supabaseAdmin } from '../config/supabase.js';
import bcrypt from 'bcryptjs';

const username = process.env.ADMIN_EMAIL || 'agentuniver@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Adm1n!Temp!2025';

async function main() {
  try {
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('admins')
      .select('id, status')
      .eq('username', username)
      .single();

    if (existing && !existErr) {
      console.log(`Admin already exists: id=${existing.id}, status=${existing.status}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .insert({ username, password_hash: passwordHash })
      .select()
      .single();

    if (error) {
      console.error('Create admin error:', error.message);
      process.exit(1);
    }

    console.log('Admin created:', admin);
  } catch (e: any) {
    console.error('Unexpected error:', e?.message || e);
    process.exit(1);
  }
}

main();

