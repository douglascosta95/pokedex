// Substitua pelas suas credenciais reais copiadas do painel do Supabase
const SUPABASE_URL = 'https://dlmtubqjhhizmxsfnwca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbXR1YnFqaGhpem14c2Zud2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNjMxNzYsImV4cCI6MjEwOTgzOTE3Nn0.mZxkkH8zPEsP2SNMNA-S7bjrLPyDqBY9DgiZ5or2Bg8';

// Inicializa a instância do Supabase globalmente
// window.supabase já existe porque importamos o script da CDN no HTML
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);