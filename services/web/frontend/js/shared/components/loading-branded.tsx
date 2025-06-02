import latexLogo from '@/shared/svgs/latex.svg'

type LoadingBrandedTypes = {
  loadProgress: number // Percentage
  label?: string
  hasError?: boolean
}

export default function LoadingBranded({
  loadProgress,
  label,
  hasError = false,
}: LoadingBrandedTypes) {
  return (
    <>
       <img src={latexLogo} style={{width: 150, height: "auto"}}/>

      {!hasError && (
        <div className="h3 loading-screen-label" aria-live="polite">
          {label}
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
          <span className="loading-screen-ellip" aria-hidden="true">
            .
          </span>
        </div>
      )}
    </>
  )
}
