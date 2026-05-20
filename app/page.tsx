import Link from 'next/link'
import { Phone, ClipboardList, LayoutDashboard, Clock, CheckCircle, MessageSquare, Star, Zap } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-zinc-900/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <VoxaroLogo size="sm" />
          <Link
            href="/login"
            className="text-sm font-medium border border-orange-500/50 text-orange-400 hover:border-orange-400 hover:text-orange-300 px-4 py-1.5 rounded-lg transition-colors"
          >
            Anmelden
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full mb-6">
          <Zap size={11} />
          KI-Telefon-Agent für Kfz-Werkstätten
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-4">
          Kein Anruf geht verloren.<br />
          <span style={{ color: '#FF6B00' }}>Samir arbeitet 24/7.</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-8">
          Voxaro verbindet deinen KI-Assistenten direkt mit deinem Werkstatt-Dashboard.
          Aufträge entstehen automatisch — du konzentrierst dich auf die Arbeit.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="mailto:kontakt@voxaro.de?subject=Demo%20Anfrage"
            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Demo vereinbaren
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Zum Dashboard
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { value: '24/7', label: 'Erreichbarkeit' },
            { value: '< 10s', label: 'Auftrag erstellt' },
            { value: '0', label: 'Verpasste Anrufe' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl sm:text-3xl font-black" style={{ color: '#FF6B00' }}>{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest text-center mb-2">So funktioniert&apos;s</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">3 Schritte — vollautomatisch</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                icon: Phone,
                title: 'Kunde ruft an',
                desc: 'Samir nimmt jeden Anruf entgegen — auch wenn du gerade in der Grube bist oder die Werkstatt geschlossen hat.',
              },
              {
                step: '02',
                icon: ClipboardList,
                title: 'Samir erfasst alles',
                desc: 'Fahrzeug, Kennzeichen, Problem und Rückrufwunsch — strukturiert aufgenommen, ohne dass du dabei sein musst.',
              },
              {
                step: '03',
                icon: LayoutDashboard,
                title: 'Auftrag im Dashboard',
                desc: 'Sofort sichtbar im Voxaro-Dashboard. Kein Zettel, kein Vergessen, kein Telefonat nötig.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-4xl font-black text-zinc-800/60 select-none leading-none">{step}</span>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <h3 className="font-bold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest text-center mb-2">Features</p>
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-12">Alles was deine Werkstatt braucht</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Clock,
                title: '24/7 Erreichbarkeit',
                desc: 'Samir schläft nie. Auch außerhalb der Öffnungszeiten werden Anrufe professionell entgegengenommen.',
              },
              {
                icon: CheckCircle,
                title: 'Automatische Auftragsanlage',
                desc: 'Aus jedem Anruf wird sofort ein strukturierter Auftrag — mit Fahrzeug, Problem und Kontaktdaten.',
              },
              {
                icon: MessageSquare,
                title: 'Status-SMS an Kunden',
                desc: 'Kunden werden automatisch per SMS informiert: Termin bestätigt, Freigabe nötig, Fahrzeug fertig.',
              },
              {
                icon: Star,
                title: 'Freigabe per Link',
                desc: 'Zusatzarbeiten mit Foto und Preis direkt per SMS freigeben lassen — kein Anruf nötig.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 mb-1.5">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-6">Pilotkunde</p>
          <blockquote className="text-xl sm:text-2xl font-semibold text-zinc-100 leading-relaxed mb-8">
            „Seit Voxaro läuft kein Anruf mehr ins Leere. Samir nimmt alles auf — ich sehe den Auftrag sofort im Dashboard."
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-orange-400">M</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-200">Auto Malik</p>
              <p className="text-xs text-zinc-500">Kfz-Werkstatt · Darmstadt</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Bereit, keinen Anruf mehr zu verpassen?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto text-sm">
            Voxaro ist bereits bei Werkstätten in Deutschland im Einsatz.
            Kontaktiere uns für eine persönliche Demo — kostenlos und unverbindlich.
          </p>
          <a
            href="mailto:kontakt@voxaro.de?subject=Demo%20Anfrage"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Demo vereinbaren
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <VoxaroLogo size="sm" />
          <p className="text-xs text-zinc-600">© 2025 Voxaro. Alle Rechte vorbehalten.</p>
          <div className="flex gap-4 text-xs text-zinc-600">
            <a href="#" className="hover:text-zinc-400 transition-colors">Impressum</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Datenschutz</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
