# Neue Routine-Features: Wochentag-spezifische Routinen & Eigene Habits

## Übersicht

Die Tagesroutinen wurden um zwei wichtige Features erweitert:

1. **Wochentag-spezifische Routinen** - Routinen können für bestimmte Wochentage definiert werden
2. **Eigene Habits erstellen** - Benutzer können eigene Habits definieren, nicht nur aus Templates wählen

## Wochentag-spezifische Routinen

### Was ist das?

Routinen können jetzt so konfiguriert werden, dass sie nur an bestimmten Wochentagen laufen. Zum Beispiel:
- **Wochentage-Routine**: Läuft nur Montag bis Freitag
- **Wochenende-Routine**: Läuft nur Samstag und Sonntag
- **Individuelle Tage**: Beliebige Kombination von Wochentagen

### Wie funktioniert es?

1. **Wochentag-Auswahl**: Beim Erstellen/Bearbeiten einer Routine können Wochentage ausgewählt werden
2. **Presets**: Schnellauswahl für häufige Kombinationen:
   - Alle Tage (Standard)
   - Wochentage (Mo-Fr)
   - Wochenende (Sa-So)
   - Arbeitswoche (Mo-Fr)
3. **Einzelne Tage**: Jeder Wochentag kann einzeln ein-/ausgeschaltet werden
4. **Automatische Kalender-Events**: Nur für die ausgewählten Wochentage werden Kalender-Events erstellt

### Vorteile

- **Flexibilität**: Verschiedene Routinen für verschiedene Lebensbereiche
- **Effizienz**: Keine unnötigen Kalender-Events an inaktiven Tagen
- **Übersichtlichkeit**: Klare Trennung zwischen Arbeits- und Freizeit-Routinen

## Eigene Habits erstellen

### Was ist das?

Benutzer können jetzt eigene Habits definieren, anstatt nur aus vordefinierten Templates zu wählen.

### Features eigener Habits

1. **Vollständige Anpassung**:
   - Name und Beschreibung
   - Kategorie (Fitness, Gesundheit, Lernen, etc.)
   - Zeitblock (Vormittag, Mittag, etc.)
   - Dauer in Minuten
   - Optional/Erforderlich markieren

2. **Visuelle Unterscheidung**:
   - Grünes "Eigen"-Label
   - Target-Icon zur Kennzeichnung
   - Gelbes "Optional"-Label bei optionalen Habits

3. **Integration**: Eigene Habits funktionieren genauso wie Template-Habits

### Verwendung

1. **Habit erstellen**: Button "Eigenen Habit erstellen" im Routine-Editor
2. **Formular ausfüllen**: Alle Felder sind optional außer dem Namen
3. **Habit hinzufügen**: Der neue Habit wird sofort zur Routine hinzugefügt
4. **Bearbeiten**: Habits können nach dem Hinzufügen weiter angepasst werden

## Technische Details

### Datenbankschema

```sql
-- Neue Spalten in daily_routines
ALTER TABLE daily_routines 
ADD COLUMN weekdays TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
ADD COLUMN is_weekend_routine BOOLEAN DEFAULT false,
ADD COLUMN is_weekday_routine BOOLEAN DEFAULT false;

-- Neue Spalten in routine_habits
ALTER TABLE routine_habits 
ADD COLUMN is_custom_habit BOOLEAN DEFAULT false,
ADD COLUMN custom_icon TEXT DEFAULT 'Target';
```

### Automatische Updates

- **Wochentag-Flags**: `is_weekend_routine` und `is_weekday_routine` werden automatisch aktualisiert
- **Kalender-Events**: Nur für aktive Wochentage werden Events erstellt
- **Trigger**: Automatische Aktualisierung bei Änderungen

### API-Endpoints

```javascript
// Wochentag-spezifische Routinen abrufen
dailyRoutinesService.getRoutinesByWeekday('monday')
dailyRoutinesService.getWeekendRoutines()
dailyRoutinesService.getWeekdayRoutines()

// Routinen mit Wochentagen erstellen/aktualisieren
dailyRoutinesService.createRoutine({
  name: 'Meine Routine',
  weekdays: ['monday', 'wednesday', 'friday']
})

// Eigene Habits erstellen
dailyRoutinesService.createHabit({
  name: 'Mein eigener Habit',
  is_custom_habit: true,
  custom_icon: 'Target'
})
```

## Verwendungsszenarien

### Szenario 1: Arbeits- und Freizeit-Routinen

- **Wochentage-Routine**: 
  - 7:00 - Meditation
  - 8:00 - Frühstück
  - 9:00 - Arbeitsbeginn
- **Wochenende-Routine**:
  - 8:00 - Ausschlafen
  - 9:00 - Frühstück
  - 10:00 - Hobby-Zeit

### Szenario 2: Individuelle Gewohnheiten

- **Montag**: Neue Woche starten, Ziele setzen
- **Mittwoch**: Midweek-Review, Motivation
- **Freitag**: Wochenabschluss, Planung fürs Wochenende

### Szenario 3: Flexible Routinen

- **Basis-Routine**: Läuft jeden Tag (Grundhygiene, etc.)
- **Zusatz-Routine**: Läuft nur bei gutem Wetter (Spaziergang)
- **Saisonale Routinen**: Verschiedene Routinen für verschiedene Jahreszeiten

## Best Practices

1. **Wochentage sinnvoll wählen**: Nicht zu viele verschiedene Routinen für denselben Tag
2. **Eigene Habits strukturieren**: Klare Kategorien und Zeitblöcke verwenden
3. **Optional markieren**: Nicht-kritische Habits als optional kennzeichnen
4. **Regelmäßigkeit**: Konsistente Wochentage für bessere Gewohnheitsbildung

## Migration

Bestehende Routinen werden automatisch auf alle Wochentage gesetzt, sodass das Verhalten unverändert bleibt. Neue Features können schrittweise genutzt werden.

## Support

Bei Fragen oder Problemen mit den neuen Features:
1. Überprüfen Sie die Datenbankverbindung
2. Stellen Sie sicher, dass alle SQL-Updates ausgeführt wurden
3. Überprüfen Sie die Browser-Konsole auf Fehlermeldungen
4. Testen Sie mit einfachen Routinen vor komplexen Konfigurationen

