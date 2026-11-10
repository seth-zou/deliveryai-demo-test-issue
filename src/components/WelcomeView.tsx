import { useTranslation } from 'react-i18next'
import { Accessibility, ArrowLeft, ArrowRight, MapPin, Sparkles, Store } from 'lucide-react'
import hotpot from '@/assets/hotpot.jpg'
import { Button } from '@/components/ui/button'
import { tableAreas } from '@/data/menu'

interface WelcomeViewProps {
  table: string
  language: string
  elderly: boolean
  onEnter: () => void
  onBack: () => void
  onToggleLanguage: () => void
  onToggleElderly: () => void
}

export function WelcomeView({ table, language, elderly, onEnter, onBack, onToggleLanguage, onToggleElderly }: WelcomeViewProps) {
  const { t } = useTranslation()
  const areaKey = tableAreas[table]
  const tableLabel = areaKey ? `${table} · ${t(areaKey)}` : table

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rice-100 paper-noise">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />

      <div className="relative mx-auto w-full max-w-md px-5 py-10">
        <section className="animate-rise overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-float backdrop-blur">
          {/* 门店图片 */}
          <div className="relative h-48 overflow-hidden sm:h-56">
            <img src={hotpot} alt={t('welcome.img_alt')} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            {/* 偏好控制区：浮在图片右上角，不占用卡片骨架与主按钮空间 */}
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleLanguage}
                aria-label={t('common.aria_lang')}
                className="h-11 w-11 border-white/40 bg-white/90 text-charcoal-900 shadow-sm backdrop-blur hover:bg-white"
              >
                <span className="text-sm font-bold">{language === 'zh' ? 'EN' : '中'}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleElderly}
                aria-label={elderly ? t('common.aria_elderly_off') : t('common.aria_elderly_on')}
                aria-pressed={elderly}
                className="h-11 w-11 border-white/40 bg-white/90 text-charcoal-900 shadow-sm backdrop-blur hover:bg-white"
              >
                <Accessibility size={18} className={elderly ? 'text-chili-500' : ''} />
              </Button>
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div className="flex items-center gap-2">
                <Store size={18} className="opacity-80" />
                <div>
                  <p className="text-xs opacity-80">{t('common.simulated_store')}</p>
                  <h2 className="text-lg font-bold">{t('common.store_name')}</h2>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{t('common.open')}</span>
            </div>
          </div>

          {/* 问候语 */}
          <div className="px-6 py-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-chili-500/20 bg-chili-50 px-3 py-1.5 text-xs font-bold text-chili-600">
              <Sparkles size={13} /> {t('welcome.badge')}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-charcoal-900 sm:text-4xl">
              {t('welcome.title')}
            </h1>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-base font-semibold text-charcoal-500">
              <MapPin size={16} className="text-chili-500" />
              {t('welcome.you_at')} {tableLabel}
            </p>
          </div>

          {/* 进入点餐主按钮与次要的返回选桌入口 */}
          <div className="px-6 pb-7">
            <Button onClick={onEnter} className="w-full">
              {t('welcome.enter')}
              <ArrowRight size={17} />
            </Button>
            <Button variant="ghost" onClick={onBack} className="mt-2 w-full">
              <ArrowLeft size={15} />
              {t('welcome.back')}
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
