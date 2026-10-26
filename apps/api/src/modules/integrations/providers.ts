/**
 * Providers voor externe cijferbronnen. De architectuur is provider-onafhankelijk; een nieuwe bron
 * implementeert alleen `fetchGrades`. Een provider levert ruwe cijfers; de mapping en de dedup zitten los.
 *
 * - `sample`: een ingebouwde voorbeeldbron met synthetische cijfers. Werkt volledig (koppelen, synchroniseren,
 *   ontkoppelen) en wordt gebruikt om de hele keten te testen en in de demo te tonen.
 * - `magister`: geregistreerd maar NIET actief. Er is geen officieel toegestane route per leerling; activeren
 *   vraagt een school-/partnerroute. We benaderen de interne Magister-API bewust niet. Zie docs/onderzoek/MAGISTER.md.
 */
import type { Ctx } from '../../http.ts';

/** Eén ruw cijfer zoals een bron het aanlevert (waarde als string, vak als tekst). */
export interface ExternalGrade {
  /** Stabiele sleutel uit de bron; voorkomt dubbele import. */
  externalRef: string;
  subjectRaw: string;
  /** Waarde zoals de bron die geeft, bijv. "6,8" of "V". */
  value: string;
  weight?: number;
  /** ISO-datum (JJJJ-MM-DD). */
  date: string;
  testName?: string;
  /** True als de bron geautoriseerd en vertrouwd is (telt als geverifieerd). */
  verified: boolean;
}

export interface LinkRow {
  user_id: string; provider: string; external_id: string | null; display_name: string | null;
  status: 'linked' | 'reauth' | 'error'; token_enc: string | null; last_sync_at: number | null; last_error: string | null;
}

export interface GradeProvider {
  id: string;
  name: string;
  school?: string;
  /** True als de bron nu daadwerkelijk te koppelen en te synchroniseren is. */
  available: boolean;
  /** Uitleg bij een niet-beschikbare bron: wat er nog nodig is. */
  note?: string;
  /** Alleen voor beschikbare bronnen: haalt de actuele cijfers op. */
  fetchGrades?(ctx: Ctx, link: LinkRow): Promise<ExternalGrade[]>;
}

/** Voorbeeldbron: vaste synthetische cijfers, zodat de hele keten werkt zonder externe toegang. */
const SAMPLE_GRADES: ExternalGrade[] = [
  { externalRef: '1', subjectRaw: 'Wiskunde', value: '6,8', weight: 2, date: '2026-09-15', testName: 'SO Hoofdstuk 1', verified: false },
  { externalRef: '2', subjectRaw: 'Nederlands', value: '7,5', weight: 1, date: '2026-09-22', testName: 'Leesvaardigheid', verified: false },
  { externalRef: '3', subjectRaw: 'Engels', value: '8,1', weight: 2, date: '2026-10-02', testName: 'Reading Unit 2', verified: false },
  { externalRef: '4', subjectRaw: 'Frans', value: '5,4', weight: 1, date: '2026-10-09', testName: 'Vocabulaire', verified: false },
  { externalRef: '5', subjectRaw: 'Biologie', value: '7,0', weight: 2, date: '2026-10-16', testName: 'Toets Cellen', verified: false },
];

export const PROVIDERS: Record<string, GradeProvider> = {
  sample: {
    id: 'sample',
    name: 'Voorbeeldkoppeling',
    available: true,
    note: 'Synthetische voorbeeldcijfers om de koppeling te proberen. Geen echte schoolgegevens.',
    fetchGrades: async () => SAMPLE_GRADES.map((g) => ({ ...g })),
  },
  magister: {
    id: 'magister',
    name: 'Magister',
    school: 'De Passie',
    available: false,
    note: 'Nog niet beschikbaar: een koppeling per leerling vraagt een officieel toegestane route via de school of een geautoriseerde partner. We benaderen de interne Magister-API bewust niet.',
  },
};

export const getProvider = (id: string): GradeProvider | undefined => PROVIDERS[id];
