// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lfvvyraaradrkbmntftl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdnZ5cmFhcmFkcmtibW50ZnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1ODY0NzEsImV4cCI6MjA2OTE2MjQ3MX0.8uH_P3YLSo-jlhYMQV02W_MEkHNq3POhGo_7N4E0ZXU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
