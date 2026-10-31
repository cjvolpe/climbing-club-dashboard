import type { TreasuryWorkspace } from '../hooks/useTreasuryWorkspace'
import Field from './Field'

type ProfileSettingsProps = Pick<TreasuryWorkspace, 'data' | 'setData' | 'setMessage'>

export default function ProfileSettings({ data, setData, setMessage }: ProfileSettingsProps) {
  return (
    <section className="settings">
      <h1>Club profile</h1>
      <p>These details appear on every trip receipt. Changes save automatically.</p>
      <div className="profile-watermark-upload">
        {data.profile.icon && <img src={data.profile.icon} alt="Current receipt watermark" />}
        <label className="field">
          <span>Receipt watermark (optional)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby="profile-watermark-help"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (!file) return
              if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                setMessage('Choose a PNG, JPEG, or WebP image for the receipt watermark.')
                return
              }
              if (file.size > 5 * 1024 * 1024) {
                setMessage('The receipt watermark must be 5 MB or smaller.')
                return
              }
              try {
                const image = await createImageBitmap(file)
                const scale = Math.min(1, 1200 / Math.max(image.width, image.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.max(1, Math.round(image.width * scale))
                canvas.height = Math.max(1, Math.round(image.height * scale))
                const context = canvas.getContext('2d', { alpha: true })
                if (!context) throw new Error('Image processing unavailable')
                context.clearRect(0, 0, canvas.width, canvas.height)
                context.drawImage(image, 0, 0, canvas.width, canvas.height)
                image.close()
                const icon = canvas.toDataURL('image/png')
                setData((current) => ({
                  ...current,
                  profile: { ...current.profile, icon }
                }))
                setMessage('Receipt watermark updated.')
              } catch {
                setMessage('This image could not be opened. Try another PNG, JPEG, or WebP image.')
              }
            }}
          />
          <small id="profile-watermark-help">
            PNG, JPEG, or WebP, up to 5 MB. Appears faintly behind the content on every PDF page.
          </small>
        </label>
        {data.profile.icon && (
          <button
            type="button"
            onClick={() =>
              setData((current) => ({
                ...current,
                profile: { ...current.profile, icon: undefined }
              }))
            }
          >
            Remove watermark
          </button>
        )}
      </div>
      <div className="form-grid">
        {(
          [
            ['organization', 'Organization name'],
            ['email', 'Email'],
            ['address', 'Street address'],
            ['city', 'City, state & ZIP'],
            ['account', 'Truist account number']
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            label={label}
            type={key === 'email' ? 'email' : 'text'}
            value={data.profile[key]}
            onChange={(value) => setData({ ...data, profile: { ...data.profile, [key]: value } })}
          />
        ))}
      </div>
      <p className="muted">
        Account details are stored locally with your records. Choose a trusted storage folder.
      </p>
    </section>
  )
}
