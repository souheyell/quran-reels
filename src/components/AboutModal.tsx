interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '92%',
          background: 'linear-gradient(145deg, #111827 0%, #0b0f19 100%)',
          border: '1px solid rgba(255, 215, 0, 0.25)',
          borderRadius: '16px',
          padding: '1.8rem',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 215, 0, 0.12)',
          color: '#f3f4f6',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#9ca3af',
            fontSize: '1.2rem',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Centerpiece Emblem */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              background: 'rgba(255, 215, 0, 0.12)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              color: '#ffd700',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '0.6rem',
            }}
          >
            🤲 صدقة جارية إن شاء الله · Sadaqah Jariyah
          </div>
          <h2
            style={{
              margin: '0.2rem 0 0.4rem 0',
              fontFamily: '"Amiri", "Scheherazade New", serif',
              fontSize: '1.8rem',
              color: '#ffffff',
            }}
          >
            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#9ca3af',
              letterSpacing: '0.05em',
            }}
          >
            ISLAMIC REELS CREATOR STUDIO
          </p>
        </div>

        {/* Sacred Quranic Reminder */}
        <div
          style={{
            background: 'rgba(255, 215, 0, 0.05)',
            borderLeft: '3px solid #ffd700',
            padding: '0.9rem 1.1rem',
            borderRadius: '8px',
            marginBottom: '1.2rem',
          }}
        >
          <p
            style={{
              margin: '0 0 0.4rem 0',
              fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
              fontSize: '1.25rem',
              direction: 'rtl',
              textAlign: 'right',
              color: '#ffd700',
              lineHeight: 1.6,
            }}
          >
            ﴿ وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ ﴾
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db', fontStyle: 'italic' }}>
            &ldquo;And remind, for indeed, the reminder benefits the believers.&rdquo; &mdash; Surah Adh-Dhariyat (51:55)
          </p>
        </div>

        {/* Hadith on Sadaqah Jariyah */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '1rem 1.1rem',
            borderRadius: '10px',
            marginBottom: '1.2rem',
          }}
        >
          <p
            style={{
              margin: '0 0 0.5rem 0',
              fontFamily: '"Amiri", "Noto Naskh Arabic", serif',
              fontSize: '1.15rem',
              direction: 'rtl',
              textAlign: 'right',
              color: '#e5e7eb',
              lineHeight: 1.6,
            }}
          >
            قال رسول الله ﷺ: «إِذَا مَاتَ ابْنُ آدَمَ انْقَطَعَ عَمَلُهُ إِلَّا مِنْ ثَلَاثٍ: صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ»
          </p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.4 }}>
            The Messenger of Allah ﷺ said: <em>&ldquo;When a human being dies, their deeds come to an end except for three: an ongoing charity (Sadaqah Jariyah), beneficial knowledge, or a righteous child who prays for them.&rdquo;</em> &mdash; (Sahih Muslim 1631)
          </p>
        </div>

        {/* App Bio & Dedication */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#d1d5db', marginBottom: '1.4rem' }}>
          <h3 style={{ fontSize: '1rem', color: '#ffffff', margin: '0 0 0.4rem 0' }}>About this Application</h3>
          <p style={{ margin: '0 0 0.6rem 0' }}>
            <strong>Islamic Reels Creator</strong> is built as a pure <strong>Sadaqah Jariyah (صدقة جارية إن شاء الله)</strong>. It is designed to empower every Muslim, creator, and student of knowledge to produce studio-grade Quran reels and reminders for Instagram Reels, TikTok, YouTube Shorts, and WhatsApp Status with ease and reverence.
          </p>
          <p style={{ margin: 0 }}>
            May Allah ﷻ accept this humble work from everyone who contributed, coded, designed, listened, recited, created, and shared these verses. May it be a source of light, guidance, and continuous reward in this life and the Hereafter. Āmīn.
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn primary"
            onClick={onClose}
            style={{ width: '100%', padding: '0.65rem', fontWeight: 600 }}
          >
            جزاكم الله خيرا · Close
          </button>
        </div>
      </div>
    </div>
  )
}
