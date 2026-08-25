export const PROFILE_ORDER = ["explorateur", "raffine", "epicurien", "ressource", "stratege"];
export const MAX_POINTS_PER_QUESTION = 3;

export const PROFILES = {
	explorateur: {
		name: "Explorateur",
		tagline: "Vous cherchez l'inattendu, les expériences qui déplacent quelque chose et les itinéraires qui laissent de la place à la découverte.",
		color: "border-teal-600/30 bg-teal-50 text-teal-950 dark:bg-teal-950/35 dark:text-teal-50",
		accent: "bg-teal-600",
		keywords: ["Immersion", "Nature", "Hors des sentiers battus"],
		recommendations: ["Road trip au rythme souple", "Croisière expédition", "Séjour multi-destinations avec expériences locales"],
	},
	raffine: {
		name: "Raffiné",
		tagline: "Vous aimez les expériences fluides, élégantes et soigneusement choisies, où chaque détail contribue au confort.",
		color: "border-sky-700/30 bg-sky-50 text-sky-950 dark:bg-sky-950/35 dark:text-sky-50",
		accent: "bg-sky-700",
		keywords: ["Élégance", "Service", "Adresse signée"],
		recommendations: ["Hôtel boutique ou palace discret", "Croisière premium", "Voyage privé avec transferts et réservations anticipées"],
	},
	epicurien: {
		name: "Épicurien",
		tagline: "Votre expérience idéale passe par la table, les rencontres, les marchés, les vins, les saveurs et les moments qui se savourent.",
		color: "border-amber-600/30 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-50",
		accent: "bg-amber-600",
		keywords: ["Gastronomie", "Art de vivre", "Rencontres"],
		recommendations: ["Circuit culinaire", "Route des vins", "Séjour urbain avec expériences gourmandes réservées"],
	},
	ressource: {
		name: "Ressourcé",
		tagline: "Vous cherchez ce qui apaise, recentre et redonne de l'espace intérieur.",
		color: "border-emerald-700/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/35 dark:text-emerald-50",
		accent: "bg-emerald-700",
		keywords: ["Repos", "Bien-être", "Douceur"],
		recommendations: ["Resort bien-être", "Retraite nature", "Séjour plage avec rythme léger et services inclus"],
	},
	stratege: {
		name: "Stratège",
		tagline: "Vous aimez comparer, optimiser et savoir que chaque choix a une raison claire: budget, temps, confort, valeur ou impact.",
		color: "border-slate-700/30 bg-slate-50 text-slate-950 dark:bg-slate-900/60 dark:text-slate-50",
		accent: "bg-slate-700",
		keywords: ["Optimisation", "Clarté", "Contrôle"],
		recommendations: ["Itinéraire efficace avec peu de friction", "Forfait à forte valeur", "Voyage construit autour des priorités budget/temps"],
	},
};

export const QUESTIONS = [
	{
		prompt: "Dans un groupe, on vous reconnaît souvent pour...",
		options: [
			{ id: "q1-a", label: "Votre capacité à garder une vue d'ensemble et à poser les bonnes questions.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q1-b", label: "Votre curiosité et votre envie d'essayer ce que les autres n'auraient pas pensé à faire.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q1-c", label: "Votre sens des détails, des belles choses et du ton juste.", scores: { raffine: 3, stratege: 1 } },
			{ id: "q1-d", label: "Votre façon de créer une ambiance chaleureuse autour d'une table ou d'une conversation.", scores: { epicurien: 3, ressource: 1 } },
			{ id: "q1-e", label: "Votre présence calme, rassurante, qui aide les autres à ralentir.", scores: { ressource: 3, raffine: 1 } },
		],
	},
	{
		prompt: "Quand vous avez une journée libre, vous êtes plus tenté par...",
		options: [
			{ id: "q2-a", label: "Laisser la journée se construire au fil des envies.", scores: { explorateur: 3, ressource: 1 } },
			{ id: "q2-b", label: "Réserver une excellente adresse et prendre le temps d'en profiter.", scores: { epicurien: 3, raffine: 1 } },
			{ id: "q2-c", label: "Organiser deux ou trois choses précises, puis garder le reste flexible.", scores: { stratege: 3, explorateur: 1 } },
			{ id: "q2-d", label: "Choisir un endroit confortable, beau, avec peu de déplacements.", scores: { raffine: 3, ressource: 1 } },
			{ id: "q2-e", label: "Ne rien prévoir de majeur et récupérer vraiment.", scores: { ressource: 3, stratege: 1 } },
		],
	},
	{
		prompt: "Devant une décision importante, votre premier réflexe est de...",
		options: [
			{ id: "q3-a", label: "Comparer les options, les risques et la valeur réelle.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q3-b", label: "Vous fier à votre intuition si l'idée vous allume.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q3-c", label: "Demander conseil à quelqu'un dont le goût vous inspire confiance.", scores: { raffine: 2, epicurien: 2 } },
			{ id: "q3-d", label: "Choisir ce qui vous enlève de la charge mentale.", scores: { ressource: 3, stratege: 1 } },
			{ id: "q3-e", label: "Imaginer l'expérience concrète: rythme, sensations, plaisir.", scores: { epicurien: 2, ressource: 2 } },
		],
	},
	{
		prompt: "Une soirée réussie, pour vous, c'est surtout...",
		options: [
			{ id: "q4-a", label: "Un lieu intime, un bon service, une atmosphère soignée.", scores: { raffine: 3, epicurien: 1 } },
			{ id: "q4-b", label: "Une discussion spontanée qui ouvre une porte inattendue.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q4-c", label: "Une table généreuse, des saveurs, des gens avec qui partager.", scores: { epicurien: 3, ressource: 1 } },
			{ id: "q4-d", label: "Un moment simple, doux, sans bruit inutile.", scores: { ressource: 3, raffine: 1 } },
			{ id: "q4-e", label: "Une sortie bien choisie, au bon moment, sans perte de temps.", scores: { stratege: 3, raffine: 1 } },
		],
	},
	{
		prompt: "Quand quelque chose ne se passe pas comme prévu...",
		options: [
			{ id: "q5-a", label: "Vous cherchez vite un plan B logique.", scores: { stratege: 3, ressource: 1 } },
			{ id: "q5-b", label: "Vous acceptez le détour si ça peut devenir intéressant.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q5-c", label: "Vous voulez qu'une personne compétente reprenne la situation en main.", scores: { raffine: 3, stratege: 1 } },
			{ id: "q5-d", label: "Vous prenez une pause avant de décider.", scores: { ressource: 3, stratege: 1 } },
			{ id: "q5-e", label: "Vous transformez le moment en prétexte pour trouver un bon café, un bon repas ou une belle rencontre.", scores: { epicurien: 3, explorateur: 1 } },
		],
	},
	{
		prompt: "Ce qui vous fatigue le plus rapidement...",
		options: [
			{ id: "q6-a", label: "Les décisions mal expliquées ou les informations floues.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q6-b", label: "Les environnements froids, impersonnels ou sans âme.", scores: { epicurien: 2, explorateur: 2 } },
			{ id: "q6-c", label: "Les lieux trop bruyants, trop chargés, trop rapides.", scores: { ressource: 3, raffine: 1 } },
			{ id: "q6-d", label: "La médiocrité dans les détails quand vous avez payé pour mieux.", scores: { raffine: 3, stratege: 1 } },
			{ id: "q6-e", label: "La répétition et les programmes trop prévisibles.", scores: { explorateur: 3, epicurien: 1 } },
		],
	},
	{
		prompt: "Si vous deviez apprendre quelque chose de nouveau, vous choisiriez...",
		options: [
			{ id: "q7-a", label: "Une compétence pratique avec une méthode claire.", scores: { stratege: 3, explorateur: 1 } },
			{ id: "q7-b", label: "Un savoir-faire artisanal ou culturel transmis par quelqu'un de passionné.", scores: { epicurien: 3, explorateur: 1 } },
			{ id: "q7-c", label: "Une pratique qui améliore votre équilibre ou votre énergie.", scores: { ressource: 3, stratege: 1 } },
			{ id: "q7-d", label: "Une discipline rare, surprenante, que peu de gens connaissent.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q7-e", label: "Un univers esthétique, précis, où la qualité se reconnaît dans les détails.", scores: { raffine: 3, epicurien: 1 } },
		],
	},
	{
		prompt: "Votre maison idéale aurait surtout...",
		options: [
			{ id: "q8-a", label: "Une cuisine vivante, accueillante, faite pour recevoir.", scores: { epicurien: 3, raffine: 1 } },
			{ id: "q8-b", label: "Des rangements efficaces, une circulation logique, rien d'inutile.", scores: { stratege: 3, ressource: 1 } },
			{ id: "q8-c", label: "Un coin calme, lumineux, presque refuge.", scores: { ressource: 3, raffine: 1 } },
			{ id: "q8-d", label: "Des objets rapportés, des histoires, des textures, du vivant.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q8-e", label: "Des matières nobles, une belle harmonie, une finition impeccable.", scores: { raffine: 3, ressource: 1 } },
		],
	},
	{
		prompt: "Quand vous offrez un cadeau, vous cherchez d'abord...",
		options: [
			{ id: "q9-a", label: "Quelque chose de beau, durable, choisi avec goût.", scores: { raffine: 3, stratege: 1 } },
			{ id: "q9-b", label: "Une expérience ou une surprise qui crée une histoire.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q9-c", label: "Quelque chose qui fera vraiment du bien à la personne.", scores: { ressource: 3, epicurien: 1 } },
			{ id: "q9-d", label: "Un cadeau utile, intelligent, parfaitement adapté.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q9-e", label: "Un moment à partager plutôt qu'un objet.", scores: { epicurien: 3, ressource: 1 } },
		],
	},
	{
		prompt: "Votre rapport au temps ressemble le plus à...",
		options: [
			{ id: "q10-a", label: "J'aime optimiser mon temps pour éviter les irritants.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q10-b", label: "J'aime avoir de longues plages libres pour respirer.", scores: { ressource: 3, explorateur: 1 } },
			{ id: "q10-c", label: "J'aime prendre le temps de savourer ce que je fais.", scores: { epicurien: 3, ressource: 1 } },
			{ id: "q10-d", label: "J'aime quand le temps peut bifurquer vers l'imprévu.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q10-e", label: "J'aime un rythme fluide, sans attente inutile ni précipitation.", scores: { raffine: 3, stratege: 1 } },
		],
	},
	{
		prompt: "Dans une librairie, vous seriez naturellement attiré par...",
		options: [
			{ id: "q11-a", label: "Les essais pratiques, guides, comparatifs ou méthodes.", scores: { stratege: 3, explorateur: 1 } },
			{ id: "q11-b", label: "Les récits d'aventure, carnets de route ou grands espaces.", scores: { explorateur: 3, ressource: 1 } },
			{ id: "q11-c", label: "Les livres de cuisine, d'art de vivre ou de culture locale.", scores: { epicurien: 3, raffine: 1 } },
			{ id: "q11-d", label: "Les beaux livres, design, architecture, photographie.", scores: { raffine: 3, epicurien: 1 } },
			{ id: "q11-e", label: "Les sujets bien-être, nature, psychologie ou lenteur.", scores: { ressource: 3, stratege: 1 } },
		],
	},
	{
		prompt: "Votre énergie sociale est plutôt...",
		options: [
			{ id: "q12-a", label: "Sélective: peu de monde, mais les bonnes personnes.", scores: { raffine: 2, ressource: 2 } },
			{ id: "q12-b", label: "Curieuse: vous aimez rencontrer des gens différents.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q12-c", label: "Chaleureuse: vous aimez créer des moments autour du partage.", scores: { epicurien: 3, ressource: 1 } },
			{ id: "q12-d", label: "Mesurée: vous aimez savoir à quoi vous dites oui.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q12-e", label: "Discrète: vous préférez les contextes calmes et respectueux.", scores: { ressource: 3, raffine: 1 } },
		],
	},
	{
		prompt: "Le compliment qui vous ferait le plus plaisir...",
		options: [
			{ id: "q13-a", label: "Tu as toujours le chic pour choisir le bon endroit.", scores: { raffine: 3, epicurien: 1 } },
			{ id: "q13-b", label: "Avec toi, on découvre toujours quelque chose.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q13-c", label: "Tu rends les choses simples et claires.", scores: { stratege: 3, ressource: 1 } },
			{ id: "q13-d", label: "Ta présence fait du bien.", scores: { ressource: 3, raffine: 1 } },
			{ id: "q13-e", label: "Tu sais créer de vrais bons moments.", scores: { epicurien: 3, explorateur: 1 } },
		],
	},
	{
		prompt: "Quand vous regardez une carte, une liste ou un menu, vous cherchez d'abord...",
		options: [
			{ id: "q14-a", label: "La logique d'ensemble pour comprendre rapidement les options.", scores: { stratege: 3, raffine: 1 } },
			{ id: "q14-b", label: "Le choix qui semble le plus vivant ou inattendu.", scores: { explorateur: 3, epicurien: 1 } },
			{ id: "q14-c", label: "La qualité des détails et le niveau d'exécution.", scores: { raffine: 3, stratege: 1 } },
			{ id: "q14-d", label: "Ce qui donne envie de prendre son temps.", scores: { epicurien: 2, ressource: 2 } },
			{ id: "q14-e", label: "Ce qui paraît simple, doux et sans surcharge.", scores: { ressource: 3, raffine: 1 } },
		],
	},
	{
		prompt: "Au fond, ce que vous recherchez le plus souvent dans vos choix personnels...",
		options: [
			{ id: "q15-a", label: "De la beauté, du confort et une impression de justesse.", scores: { raffine: 3, ressource: 1 } },
			{ id: "q15-b", label: "De la liberté, du mouvement et une petite part d'inconnu.", scores: { explorateur: 3, ressource: 1 } },
			{ id: "q15-c", label: "Du plaisir, de la présence et des souvenirs qui se partagent.", scores: { epicurien: 3, explorateur: 1 } },
			{ id: "q15-d", label: "Du calme, de l'espace mental et une sensation de retour à soi.", scores: { ressource: 3, epicurien: 1 } },
			{ id: "q15-e", label: "De la cohérence, de la valeur et des décisions bien calibrées.", scores: { stratege: 3, raffine: 1 } },
		],
	},
];

export function getScores(answers) {
	return answers.reduce(
		(scores, answerId, index) => {
			if (!answerId) return scores;
			const option = QUESTIONS[index]?.options.find((item) => item.id === answerId);
			if (!option) return scores;
			for (const [profile, value] of Object.entries(option.scores)) {
				scores[profile] += value;
			}
			return scores;
		},
		PROFILE_ORDER.reduce((scores, profile) => ({ ...scores, [profile]: 0 }), {}),
	);
}

export function getResult(scores) {
	return PROFILE_ORDER.map((profile) => ({ key: profile, score: scores[profile] })).sort((a, b) => b.score - a.score || PROFILE_ORDER.indexOf(a.key) - PROFILE_ORDER.indexOf(b.key));
}

export function getTravelProfileResult(answers) {
	const scores = getScores(answers);
	const ranking = getResult(scores);
	return {
		scores,
		ranking,
		primary: ranking[0],
		secondary: ranking[1],
	};
}
