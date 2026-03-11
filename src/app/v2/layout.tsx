import AppChromeV2 from '@/components/v2/AppChromeV2'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppChromeV2 />
    </>
  )
}
