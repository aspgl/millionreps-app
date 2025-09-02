# 📅 Kalender Debug Guide

## 🔍 Häufige Probleme beim Event-Speichern

### 1. **Datenbank-Schema nicht erstellt**
```sql
-- Prüfe ob die Tabelle existiert:
SELECT * FROM information_schema.tables 
WHERE table_name = 'calendar_events';

-- Falls nicht, führe das Schema aus:
-- Kopiere den Inhalt aus calendar_schema_lean.sql
```

### 2. **RLS-Policies fehlen**
```sql
-- Prüfe RLS-Policies:
SELECT * FROM pg_policies 
WHERE tablename = 'calendar_events';

-- Falls leer, führe das Schema erneut aus
```

### 3. **User nicht authentifiziert**
```javascript
// In der Browser-Konsole prüfen:
const { user } = await supabase.auth.getUser();
console.log('User:', user);
```

### 4. **Falsche Datenstruktur**
```javascript
// Korrekte Event-Datenstruktur:
const eventData = {
  title: 'Event Titel',
  description: 'Beschreibung',
  startTime: new Date().toISOString(), // WICHTIG: ISO String
  endTime: new Date(Date.now() + 3600000).toISOString(),
  category: 'general',
  color: '#3B82F6',
  location: 'Ort',
  allDay: false
};
```

### 5. **Supabase-Verbindung**
```javascript
// Prüfe Supabase-Verbindung:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

## 🧪 Test-Schritte

### 1. **Test-Route verwenden**
```
Gehe zu: http://localhost:5173/calendar-test
```

### 2. **Browser-Konsole prüfen**
```javascript
// Öffne Developer Tools (F12)
// Schaue in die Console für Fehlermeldungen
```

### 3. **Supabase Dashboard prüfen**
- Gehe zu deinem Supabase Projekt
- SQL Editor → Prüfe ob `calendar_events` Tabelle existiert
- Authentication → Prüfe ob User existiert

### 4. **Manueller Test**
```javascript
// In der Browser-Konsole:
import { calendarService } from './lib/calendar.js';

// Test Event erstellen
const testEvent = {
  title: 'Test',
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 3600000).toISOString(),
  category: 'general'
};

await calendarService.createEvent(testEvent);
```

## 🚨 Häufige Fehlermeldungen

### `relation "calendar_events" does not exist`
- **Lösung**: Schema ausführen

### `new row violates row-level security policy`
- **Lösung**: RLS-Policies prüfen/erstellen

### `invalid input syntax for type uuid`
- **Lösung**: User-ID Format prüfen

### `column "start_time" is of type timestamp with time zone`
- **Lösung**: ISO String für Datum verwenden

## ✅ Erfolgreiche Event-Erstellung

Wenn alles funktioniert, solltest du sehen:
```javascript
// In der Konsole:
Creating event with data: {title: "Test", ...}
User ID: 123e4567-e89b-12d3-a456-426614174000
Formatted event data: {title: "Test", start_time: "2024-01-15T...", ...}
Event created successfully: {id: "...", title: "Test", ...}
```

## 🔧 Debug-Tools

### 1. **CalendarTest Komponente**
- Route: `/calendar-test`
- Testet Event-Erstellung und -Abruf
- Zeigt detaillierte Fehlermeldungen

### 2. **Erweiterte Logging**
- Alle Service-Aufrufe werden geloggt
- Supabase-Fehler werden detailliert angezeigt

### 3. **Schema-Validierung**
```sql
-- Prüfe Tabelle-Struktur:
\d calendar_events

-- Prüfe Policies:
\dp calendar_events
```
