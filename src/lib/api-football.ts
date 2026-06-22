export interface WCGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  home_scorers: string;
  away_scorers: string;
  group: string;
  matchday: string;
  local_date: string;
  stadium_id: string;
  finished: string;
  time_elapsed: string;
  type: string;
  home_team_name_en: string;
  away_team_name_en: string;
  home_flag?: string;
  away_flag?: string;
  home_fifa_code?: string;
  away_fifa_code?: string;
  stadium_name?: string;
  stadium_city?: string;
}

export interface WCTeam {
  id: string;
  name_en: string;
  flag: string;
  fifa_code: string;
  iso2: string;
  groups: string;
}

export interface WCStadium {
  id: string;
  name_en: string;
  fifa_name: string;
  city_en: string;
  country_en: string;
  capacity: number;
}

export interface WCGroupTeam {
  team_id: string;
  team_name?: string;
  team_flag?: string;
  team_fifa_code?: string;
  mp: string;
  w: string;
  l: string;
  d: string;
  pts: string;
  gf: string;
  ga: string;
  gd: string;
}

export interface WCGroup {
  name: string;
  teams: WCGroupTeam[];
}
