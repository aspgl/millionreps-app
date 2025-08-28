# Deep Work Calendar Integration

## 🧠 **Übersicht**

Die Deep Work Sessions werden jetzt vollständig in den Kalender integriert und zeigen alle wichtigen Informationen auf einen Blick.

## ✨ **Features**

### 📅 **Kalender-Integration**
- **Alle Views**: Deep Work Sessions erscheinen in Monat, Woche, Tag und Agenda View
- **Automatische Konvertierung**: Sessions werden automatisch zu Kalender-Events konvertiert
- **Farbkodierung**: Jede Session-Type hat ihre eigene Farbe
- **Filter**: Deep Work Events können ein-/ausgeblendet werden

### 📊 **Detaillierte Session-Ansicht**
- **Session-Status**: Geplant, In Bearbeitung, Pausiert, Abgeschlossen
- **Dauer-Statistiken**: Geplante vs. tatsächliche Dauer
- **Fokus-Score**: Bewertung von 1-10 mit Farbkodierung
- **Aufgaben-Fortschritt**: Erledigte vs. geplante Aufgaben
- **Ablenkungen**: Anzahl der Ablenkungen während der Session
- **Tags**: Alle zugeordneten Tags

### 📈 **Statistik-Dashboard**
- **Monatliche Übersicht**: Sessions, Gesamtdauer, Durchschnitts-Fokus
- **Live-Updates**: Statistiken werden automatisch aktualisiert
- **Visuelle Indikatoren**: Farbkodierte Badges für schnelle Übersicht

## 🛠 **Technische Implementierung**

### **Services**
- `DeepWorkService`: Hauptservice für Deep Work Daten
- `convertSessionsToEvents()`: Konvertiert Sessions zu Kalender-Events
- `getSessionStats()`: Berechnet Statistiken für Zeiträume

### **Komponenten**
- `DeepWorkEventDetails`: Detaillierte Session-Ansicht
- Integration in `Kalender.jsx`: Vollständige Kalender-Integration

### **Datenbank-Schema**
```sql
create table public.deepwork_sessions (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  session_type_id uuid null,
  title character varying(255) not null,
  description text null,
  goal text null,
  tags text[] null,
  planned_duration integer not null,
  actual_duration integer null,
  break_duration integer null default 0,
  focus_score integer null,
  status character varying(20) null default 'planned'::character varying,
  started_at timestamp with time zone null,
  paused_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  distractions_count integer null default 0,
  tasks_completed integer null default 0,
  total_tasks integer null default 0
);
```

## 🎯 **Verwendung**

### **1. Deep Work Sessions anzeigen**
- Sessions erscheinen automatisch im Kalender
- Klicke auf eine Session für Details
- Filter können ein-/ausgeschaltet werden

### **2. Session-Details einsehen**
- **Status**: Aktueller Status der Session
- **Dauer**: Geplante vs. tatsächliche Zeit
- **Fokus**: Bewertung der Konzentration
- **Aufgaben**: Fortschritt der geplanten Aufgaben
- **Ablenkungen**: Anzahl der Unterbrechungen

### **3. Statistiken verfolgen**
- **Monatliche Übersicht**: Oben rechts im Kalender
- **Sessions**: Anzahl der Sessions im Monat
- **Gesamtdauer**: Summe aller Session-Zeiten
- **Durchschnitts-Fokus**: Mittlerer Fokus-Score

## 🚀 **Nächste Schritte**

### **Geplante Features**
- [ ] **Session-Templates**: Vordefinierte Session-Typen
- [ ] **Automatische Planung**: KI-basierte Session-Vorschläge
- [ ] **Integration mit Goals**: Verbindung zu Zielen
- [ ] **Export-Funktionen**: PDF/CSV Export der Statistiken
- [ ] **Team-Deep-Work**: Gemeinsame Sessions

### **Optimierungen**
- [ ] **Performance**: Caching für große Datenmengen
- [ ] **Offline-Support**: Lokale Speicherung
- [ ] **Push-Notifications**: Session-Erinnerungen
- [ ] **Analytics**: Detaillierte Auswertungen

## 💡 **Tipps für bessere Deep Work Sessions**

1. **Planung**: Plane Sessions im Voraus
2. **Fokus-Score**: Bewerte ehrlich deine Konzentration
3. **Ablenkungen**: Dokumentiere Unterbrechungen
4. **Aufgaben**: Setze realistische Ziele
5. **Tags**: Nutze Tags für bessere Kategorisierung

---

**Die Deep Work Integration macht deine Produktivität sichtbar und messbar! 🧠⚡**
