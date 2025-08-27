# 🎯 Goal Tracking System

Ein umfassendes Ziel-Tracking-System für MillionReps, das auf JSON-basierten Datenstrukturen aufbaut und nahtlos in die bestehende Datenbank-Architektur integriert ist.

## ✨ Features

### 🎯 Zielmetrik-System
- **Flexible Metriken**: Verschiedene Einheiten (kg, €, Stunden, Seiten, etc.)
- **Richtung**: Abnahme oder Zunahme
- **Automatischer Fortschrittsrechner**: Prozent = (current_value - start_value) / (target_value - start_value) × 100

### ⏱️ Timer & Zeitmanagement
- **Resttage-Anzeige**: Verbleibende Tage bis Zieldatum
- **Zeit-Fortschritt**: Prozentuale Anzeige der vergangenen Zeit
- **On-Track/Off-Track Status**: Automatische Bewertung des Fortschritts

### 📊 Check-In System
- **Manuelle Eingabe**: Direkte Werteingabe mit Notizen
- **API-Integration**: Vorbereitet für Health-Daten, Finance-APIs, etc.
- **Erwartete Frequenz**: Reminder-System für regelmäßige Check-Ins

### 🏆 Milestones & Belohnungen
- **Zwischenschritte**: User kann eigene Meilensteine setzen
- **Automatische Benachrichtigungen**: Bei erreichten Milestones
- **Belohnungssystem**: Motivation durch definierte Belohnungen

### 🤖 Automatische Task-Generierung
- **Zielbasierte Tasks**: Automatische Erstellung von Aufgaben
- **Integration**: Tasks erscheinen im SuperDays-Taskflow
- **Templates**: Vordefinierte Task-Templates für verschiedene Zieltypen

### 📝 Diary/After Action Report Integration
- **Automatische Datenflüsse**: Check-In Daten fließen in Diary
- **Fortschrittsgraphiken**: Rendering im AAR
- **Aktivitäts-Timeline**: Vollständige Historie aller Zielaktivitäten

## 🗄️ Datenbank-Architektur

### Haupttabellen

#### `user_goals`
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key zu auth.users)
- title: VARCHAR(200)
- description: TEXT
- category: VARCHAR(100) -- personal, health, finance, career, learning
- goal_metric: JSONB -- Flexible Metrik-Definition
- start_date: DATE
- target_date: DATE
- check_in_frequency: VARCHAR(50) -- daily, weekly, monthly
- status: VARCHAR(20) -- active, paused, completed, abandoned
- progress_percentage: DECIMAL(5,2)
- is_on_track: BOOLEAN
- milestones: JSONB -- Array von Milestones
- auto_generate_tasks: BOOLEAN
- task_template: JSONB -- Template für automatische Tasks
- linked_project_id: UUID -- Verknüpfung mit Projekten
- linked_tasks: JSONB -- Array von Task-IDs
- color: VARCHAR(7) -- Hex-Farbe
- icon: VARCHAR(50) -- Icon-Name
```

#### `goal_check_ins`
```sql
- id: UUID (Primary Key)
- goal_id: UUID (Foreign Key zu user_goals)
- user_id: UUID (Foreign Key zu auth.users)
- check_in_date: DATE
- current_value: DECIMAL(10,2)
- notes: TEXT
- progress_percentage: DECIMAL(5,2)
- is_on_track: BOOLEAN
- data_source: VARCHAR(100) -- manual, health_api, finance_api
- external_data: JSONB -- Zusätzliche API-Daten
```

#### `goal_activities`
```sql
- id: UUID (Primary Key)
- goal_id: UUID (Foreign Key zu user_goals)
- user_id: UUID (Foreign Key zu auth.users)
- activity_type: VARCHAR(50) -- milestone_achieved, check_in, status_change, task_completed
- title: VARCHAR(200)
- description: TEXT
- related_task_id: UUID -- Verknüpfung mit Tasks
- related_session_id: UUID -- Verknüpfung mit Deep Work Sessions
- metadata: JSONB -- Zusätzliche Aktivitätsdaten
```

#### `goal_templates`
```sql
- id: UUID (Primary Key)
- name: VARCHAR(200)
- description: TEXT
- category: VARCHAR(100)
- template_data: JSONB -- Vollständige Template-Definition
- is_public: BOOLEAN
- created_by: UUID (Foreign Key zu auth.users)
```

### JSON-Strukturen

#### Goal Metric
```json
{
  "attribute": "weight",
  "unit": "kg",
  "direction": "decrease",
  "start_value": 80.0,
  "target_value": 70.0,
  "current_value": 75.0
}
```

#### Milestones
```json
[
  {
    "id": "uuid",
    "title": "5kg verloren",
    "target_value": 75.0,
    "reward": "Neue Klamotten",
    "achieved": false,
    "achieved_at": null
  }
]
```

#### Task Template
```json
{
  "daily_tasks": {
    "Gewicht tracken": "Tägliche Gewichtsmessung und Dokumentation",
    "Wasser trinken": "Mindestens 2L Wasser pro Tag",
    "Bewegung": "30 Minuten Bewegung oder Sport"
  }
}
```

## 🚀 Installation & Setup

### 1. Datenbank-Schema ausführen
```sql
-- Führe goal_tracking_schema.sql in deiner Supabase SQL Editor aus
```

### 2. Komponente integrieren
Die `GoalTracker.jsx` Komponente ist bereits in die App integriert:
- Route: `/goals`
- Sidebar-Navigation: "Ziele" mit Target-Icon
- Vollständig responsive Design

### 3. Berechtigungen
Das System verwendet Row Level Security (RLS) mit folgenden Policies:
- Users können nur ihre eigenen Ziele sehen/bearbeiten
- Templates sind öffentlich verfügbar
- Check-Ins und Activities sind user-spezifisch

## 🎨 UI/UX Features

### 📱 Responsive Design
- **Mobile-First**: Optimiert für alle Bildschirmgrößen
- **Touch-Friendly**: Große Buttons und intuitive Gesten
- **Dark Mode**: Vollständige Dark Mode Unterstützung

### 🎯 Intuitive Navigation
- **Overview**: Übersicht aller Ziele mit Statistiken
- **Detail View**: Detaillierte Ansicht einzelner Ziele
- **Create Flow**: Schritt-für-Schritt Zielerstellung
- **Template System**: Schnellstart mit vordefinierten Templates

### 📊 Visualisierung
- **Progress Bars**: Animierte Fortschrittsbalken
- **Color Coding**: On-Track (Grün) vs Off-Track (Orange)
- **Icons**: Kategorie-spezifische Icons
- **Charts**: Fortschritts- und Zeit-Visualisierungen

## 🔧 Automatisierung

### Trigger & Functions
- **Automatische Fortschrittsberechnung** bei Check-Ins
- **Milestone-Check**: Automatische Erkennung erreichter Meilensteine
- **Task-Generierung**: Automatische Erstellung von Aufgaben
- **Activity-Tracking**: Vollständige Historie aller Aktionen

### Integration
- **Task Manager**: Automatische Verknüpfung mit bestehenden Tasks
- **Deep Work**: Integration mit Deep Work Sessions
- **Diary System**: Automatische Datenflüsse in After Action Reports

## 📋 Verwendung

### Neues Ziel erstellen
1. Navigiere zu `/goals`
2. Klicke "Neues Ziel" oder wähle ein Template
3. Fülle die Zielmetrik aus (Attribut, Einheit, Richtung)
4. Setze Start- und Zieldatum
5. Definiere optional Milestones
6. Speichere das Ziel

### Check-In durchführen
1. Öffne ein aktives Ziel
2. Klicke auf den Check-In Button
3. Gib den aktuellen Wert ein
4. Füge optional Notizen hinzu
5. Speichere den Check-In

### Milestones verwalten
1. Öffne die Ziel-Details
2. Scrolle zu den Milestones
3. Erreichte Milestones werden automatisch markiert
4. Belohnungen werden angezeigt

## 🎯 Template-System

### Verfügbare Templates
- **Gewicht verlieren**: Gesundheit mit täglichen Check-Ins
- **Muskelmasse aufbauen**: Fitness mit wöchentlichen Updates
- **Sparen für Urlaub**: Finanzen mit Sparplan
- **Neue Sprache lernen**: Lernen mit strukturiertem Ansatz

### Custom Templates
- User können eigene Templates erstellen
- Templates können öffentlich oder privat sein
- Vollständige Anpassbarkeit aller Parameter

## 🔮 Zukünftige Erweiterungen

### API-Integrationen
- **Health APIs**: Apple Health, Google Fit, Fitbit
- **Finance APIs**: Banking, Investment Tracking
- **Productivity APIs**: RescueTime, Toggl, etc.

### Erweiterte Features
- **Social Sharing**: Ziele mit Freunden teilen
- **Challenges**: Community-basierte Herausforderungen
- **AI-Assistenz**: Intelligente Zielvorschläge
- **Gamification**: XP-System für erreichte Ziele

### Analytics & Reporting
- **Trend-Analyse**: Langzeit-Fortschrittsanalyse
- **Predictive Analytics**: Vorhersage von Zielerreichung
- **Export-Funktionen**: PDF-Reports, CSV-Export

## 🛠️ Technische Details

### Performance
- **Indexed Queries**: Optimierte Datenbankabfragen
- **Lazy Loading**: Effiziente Datenladung
- **Caching**: Intelligente Datenzwischenspeicherung

### Sicherheit
- **Row Level Security**: Vollständige Datenisolation
- **Input Validation**: Sichere Dateneingabe
- **SQL Injection Protection**: Prepared Statements

### Skalierbarkeit
- **JSON-basierte Metriken**: Flexible Erweiterbarkeit
- **Modulare Architektur**: Einfache Wartung und Erweiterung
- **API-First Design**: Vorbereitet für externe Integrationen

---

**Entwickelt für MillionReps** - Ein umfassendes Ziel-Tracking-System, das Benutzer dabei unterstützt, ihre Träume zu verwirklichen und ihre Ziele systematisch zu erreichen.
