import type { RoleOnboardingConfig } from "../types";
export function OnboardingWelcomeStep({ config, userName }: { config: RoleOnboardingConfig; userName: string }) {
 return <div className="space-y-4 py-2">
   <h2 className="text-2xl font-semibold">Olá, {userName.split(" ")[0]}</h2>
   <p className="text-sm text-muted-foreground">{config.welcomeSubtitle}</p>
   <ul className="list-disc space-y-3 pl-5 text-sm">
     {config.benefitBullets.slice(0, 3).map((bullet) => <li key={bullet.title}><span className="font-medium">{bullet.title}</span><p className="text-muted-foreground">{bullet.desc}</p></li>)}
   </ul>
 </div>;
}
