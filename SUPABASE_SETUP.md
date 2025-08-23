# Supabase Authentication Setup

## Redirect URL Configuration

Um das Redirect-Problem nach der Email-Bestätigung zu beheben, müssen die Redirect-URLs in deinem Supabase-Projekt korrekt konfiguriert werden.

### 1. Supabase Dashboard öffnen
- Gehe zu [supabase.com](https://supabase.com)
- Wähle dein Projekt aus
- Gehe zu **Authentication** → **URL Configuration**

### 2. Site URL setzen
Setze die **Site URL** auf deine Vercel-Domain:
```
https://deine-app.vercel.app
```

### 3. Redirect URLs hinzufügen
Füge folgende URLs zu den **Redirect URLs** hinzu:

**Für Development:**
```
http://localhost:5173
http://localhost:5173/
```

**Für Production:**
```
https://deine-app.vercel.app
https://deine-app.vercel.app/
```

### 4. Email Template anpassen (Optional)
Gehe zu **Authentication** → **Email Templates** → **Confirm signup**
- Stelle sicher, dass die Email-Templates die korrekte Domain verwenden

### 5. Environment Variables prüfen
Stelle sicher, dass deine `.env` Datei korrekt konfiguriert ist:
```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key
```

### 6. Vercel Environment Variables
Füge die gleichen Environment Variables in deinem Vercel-Projekt hinzu:
- Gehe zu deinem Vercel-Projekt
- **Settings** → **Environment Variables**
- Füge `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinzu

## Testing

1. **Development**: Registriere dich mit einer neuen Email-Adresse
2. **Email bestätigen**: Klicke auf den Link in der Bestätigungs-Email
3. **Redirect prüfen**: Du solltest zu `http://localhost:5173` weitergeleitet werden

4. **Production**: Deploye die Änderungen und teste erneut
5. **Email bestätigen**: Du solltest zu deiner Vercel-Domain weitergeleitet werden

## Troubleshooting

### Problem: Redirect zu localhost in Production
- Prüfe die Supabase Redirect URLs
- Stelle sicher, dass die Site URL korrekt ist
- Überprüfe die Environment Variables in Vercel

### Problem: Email-Link funktioniert nicht
- Prüfe die Email-Templates in Supabase
- Stelle sicher, dass die Domain in den Templates korrekt ist

### Problem: Session wird nicht erkannt
- Prüfe die `detectSessionInUrl` Konfiguration
- Stelle sicher, dass die Redirect URLs exakt übereinstimmen
