# Kalender Setup für MillionReps

## 🗄️ Supabase Datenbank Setup

### 1. Supabase Schema erstellen

1. Gehe zu deinem Supabase Dashboard
2. Öffne den SQL Editor
3. Führe das `calendar_schema.sql` Script aus:

```sql
-- Kopiere den gesamten Inhalt von calendar_schema.sql hier ein
```

### 2. Tabellen und Funktionen

Das Schema erstellt:

- **`calendar_events`** - Haupttabelle für Events
- **RLS Policies** - Sicherheit für User-spezifische Daten
- **Helper Functions** - Für verschiedene Event-Abfragen
- **Indexes** - Für bessere Performance

### 3. Spalten der calendar_events Tabelle

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `user_id` | UUID | Referenz auf auth.users |
| `title` | TEXT | Event-Titel (Pflichtfeld) |
| `description` | TEXT | Event-Beschreibung |
| `start_time` | TIMESTAMP | Start-Zeit (Pflichtfeld) |
| `end_time` | TIMESTAMP | End-Zeit (Pflichtfeld) |
| `category` | TEXT | Kategorie (work, health, learning, finance, personal) |
| `priority` | TEXT | Priorität (low, medium, high) |
| `location` | TEXT | Ort |
| `attendees` | TEXT[] | Array von Teilnehmern |
| `tags` | TEXT[] | Array von Tags |
| `color` | TEXT | Hex-Farbe für UI |
| `icon` | TEXT | Icon-Name |
| `is_all_day` | BOOLEAN | Ganztägiges Event |
| `is_recurring` | BOOLEAN | Wiederkehrendes Event |
| `recurrence_rule` | TEXT | iCal RRULE Format |
| `created_at` | TIMESTAMP | Erstellungszeit |
| `updated_at` | TIMESTAMP | Aktualisierungszeit |

### 4. Verfügbare Funktionen

#### Event-Management
- `get_user_events(user_id, start_date, end_date)` - Events für Zeitraum
- `get_user_events_for_day(user_id, date)` - Events für einen Tag
- `get_user_upcoming_events(user_id, limit)` - Zukünftige Events
- `search_user_events(user_id, search_term, limit)` - Event-Suche

#### CRUD Operationen
- **Create**: `CalendarService.createEvent(eventData)`
- **Read**: `CalendarService.getEvents(userId)`
- **Update**: `CalendarService.updateEvent(eventId, eventData)`
- **Delete**: `CalendarService.deleteEvent(eventId)`

### 5. Sicherheit (RLS)

- Jeder User kann nur seine eigenen Events sehen/bearbeiten
- Automatische User-ID-Zuordnung bei neuen Events
- Sichere Abfragen durch RLS Policies

### 6. Performance

- Indexes auf `user_id`, `start_time`, `category`
- Composite Index auf `user_id, start_time`
- Optimierte Abfragen für verschiedene Views

## 🚀 Verwendung

### Event erstellen
```javascript
const eventData = {
  userId: user.id,
  title: 'Meeting',
  description: 'Team Meeting',
  start: new Date('2024-12-20T10:00:00'),
  end: new Date('2024-12-20T11:00:00'),
  category: 'work',
  priority: 'high',
  location: 'Zoom',
  attendees: ['Max', 'Anna'],
  tags: ['meeting', 'team']
};

const newEvent = await CalendarService.createEvent(eventData);
```

### Events laden
```javascript
// Alle Events
const events = await CalendarService.getEvents(user.id);

// Events für einen Tag
const dayEvents = await CalendarService.getEventsForDay(user.id, new Date());

// Events für eine Woche
const weekEvents = await CalendarService.getEventsForWeek(user.id, weekStart);

// Zukünftige Events
const upcoming = await CalendarService.getUpcomingEvents(user.id, 10);
```

### Event suchen
```javascript
const searchResults = await CalendarService.searchEvents(user.id, 'meeting');
```

## 🔧 Troubleshooting

### Häufige Probleme

1. **RLS Policy Error**
   - Stelle sicher, dass der User eingeloggt ist
   - Prüfe, ob die RLS Policies korrekt erstellt wurden

2. **Permission Denied**
   - User muss authentifiziert sein
   - Prüfe Supabase Auth-Einstellungen

3. **Event wird nicht gespeichert**
   - Prüfe alle Pflichtfelder (title, start_time, end_time)
   - Stelle sicher, dass user_id korrekt gesetzt ist

### Debugging

```javascript
// Debug-Events laden
const events = await CalendarService.getEvents(user.id);
console.log('Loaded events:', events);

// Debug-Event erstellen
try {
  const newEvent = await CalendarService.createEvent(eventData);
  console.log('Created event:', newEvent);
} catch (error) {
  console.error('Error creating event:', error);
}
```

## 📊 Monitoring

### Supabase Dashboard
- Gehe zu "Table Editor" → "calendar_events"
- Überwache "Logs" für Fehler
- Prüfe "API" für Request/Response

### Performance
- Überwache Query-Performance in "Database" → "Logs"
- Prüfe Index-Nutzung
- Monitor RLS Policy Performance

## 🔄 Migration von localStorage

Falls du bereits Events im localStorage hast:

```javascript
// Migration Script
const migrateFromLocalStorage = async () => {
  const savedEvents = localStorage.getItem('calendar_events');
  if (savedEvents) {
    const events = JSON.parse(savedEvents);
    
    for (const event of events) {
      try {
        await CalendarService.createEvent({
          userId: user.id,
          title: event.title,
          description: event.description,
          start: new Date(event.start),
          end: new Date(event.end),
          category: event.category,
          priority: event.priority,
          location: event.location,
          attendees: event.attendees,
          tags: event.tags,
          color: event.color,
          icon: event.icon
        });
      } catch (error) {
        console.error('Migration error:', error);
      }
    }
    
    // Lösche localStorage nach erfolgreicher Migration
    localStorage.removeItem('calendar_events');
  }
};
```

## ✅ Checkliste

- [ ] Supabase Schema ausgeführt
- [ ] RLS Policies aktiv
- [ ] Indexes erstellt
- [ ] Helper Functions verfügbar
- [ ] CalendarService importiert
- [ ] User Authentication funktioniert
- [ ] Events können erstellt werden
- [ ] Events können geladen werden
- [ ] Events können bearbeitet werden
- [ ] Events können gelöscht werden
- [ ] Suche funktioniert
- [ ] Alle Views funktionieren

## 🎯 Nächste Schritte

1. **Google Calendar Integration**
2. **Recurring Events**
3. **Event Notifications**
4. **Calendar Sharing**
5. **Export/Import (iCal)**
6. **Mobile App**
