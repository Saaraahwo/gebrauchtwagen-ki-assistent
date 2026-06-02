import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-sm leading-relaxed">
      <Link href="/" className="text-sm text-bmw-blue hover:underline">← Zurück</Link>
      <h1 className="text-xl font-bold mt-3 mb-4">Datenschutz — welche Daten wir speichern</h1>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Chat-Fragen</h2>
        <p className="text-bmw-gray-text">Gespeichert werden: die gestellte Frage, die Antwort, der Zeitpunkt und die Fahrzeug-Nr. — <strong>keine Kontaktdaten</strong>. Zweck: Beantwortung Ihrer Fragen und Auswertung häufiger Fragen.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Probefahrt-Anfragen</h2>
        <p className="text-bmw-gray-text">Gespeichert werden: Name, Telefonnummer, Wunschtermin und das Fahrzeug. Zweck: Terminvereinbarung. Die Eingabe erfolgt freiwillig und nur mit Ihrer Einwilligung.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Speicherort & Weitergabe</h2>
        <p className="text-bmw-gray-text">Die Daten werden lokal beim Händler in einer Datei (SQLite) gespeichert (Demo-Umgebung). <strong>Keine Weitergabe an Dritte.</strong></p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Löschung</h2>
        <p className="text-bmw-gray-text">Der Händler kann die gespeicherten Chat-Fragen und Probefahrt-Anfragen jederzeit vollständig löschen.</p>
      </section>
    </div>
  );
}
