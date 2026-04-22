import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qilimxwoanxomukwifzl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbGlteHdvYW54b211a3dpZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTI1NjYsImV4cCI6MjA5MjIyODU2Nn0.edXoti2fJwa9AoANSzGj1oZGvqm7uiRgjQTwoLr-Qxg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
