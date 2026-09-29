import "./globals.css";
import { PetalBackground } from "@/components/PetalBackground";
export const metadata={title:"Kelvia & Erick — RSVP",description:"Confirmação de presença do casamento de Kelvia & Erick."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><PetalBackground />{children}</body></html>}
