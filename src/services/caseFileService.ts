import { supabase } from '../lib/supabase';
import { createCaseFileService } from './caseFiles.js';

export const caseFileService = createCaseFileService(supabase, import.meta.env.VITE_SUPABASE_URL);
