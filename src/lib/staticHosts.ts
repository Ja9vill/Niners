import { Host, Tier, BaseSalaryTier, HostStatus, AnchorType, Role } from '../types';

export const RAW_LEADERS_TEXT = `
19381364    NINE Talent Management  -   -   -   -   -   -   31907
19157913    Miss Nine   Founder Director    -   -   -   ACTIVE  3Plus19=2007
21821805    Miles   Head Admin  Head of Operations  S idol  MISS NINE   19157913    ACTIVE  F97BCDEB
30747697    Ely Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  F88429C8
18980270    Jean    Agency Leader   Manager -   NINE AGENCY 19381364    ACTIVE  645FD830
24124167    March   Agency Leader   Manager Esports NINE AGENCY 19381364    ACTIVE  B5620DC8
6728969 Myrill  Agency Leader   Manager -   NINE AGENCY 19381364    ACTIVE  E448ADAD
9940053 Nhiya   Agency Leader   Sub Agent   S idol  MISS NINE   19157913    ACTIVE  83F1942D
19781046    Vine    Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  EBECF48F
18335592    Yoshi   Agency Leader   Manager S idol  NINE AGENCY 19381364    ACTIVE  CA1AEDC9
4439877 Chief A Agency Leader   Admin   -   NINE AGENCY 19381364    INCONSISTENT    851BF76A
11833865    Yudi    Agency Leader   Admin   -   NINE AGENCY 19381364    ACTIVE  19793CA5
5370932 Nameless    Agency Leader   Admin   -   NINE AGENCY 19381364    ACTIVE  8666DAFC
22143679    Dhie2x  Agency Leader   Sub Agent   -   NINE AGENCY 19381364    INCONSISTENT    59720DBD
3003126 Lina    Agency Leader   Sub Agent   -   NINE AGENCY 19381364    ACTIVE  F910E204
18540870    Aimee   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  BCE0F23B
19841422    Armae   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  BFE43140
11155826    Team Nhia   Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  FA73C901
54654841    Team KJP    Agency Leader   Host    -   NINE AGENCY 19381364    ACTIVE  F76BC35B
`;

export const RAW_HOSTS_TEXT = `
14129568    Alli    Talent  Host    S idol  Mngr. Ely   NINE AGENCY 19381364    ACTIVE  BB898D21
2934176 Allyy   Talent  Host    Star Host   -   NINE AGENCY 19381364    INACTIVE    C2EA864B
62652388    Amitzuke    Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    C02EBDF5
26645601    Angel   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    0272D3FB
66988219    Angel.  Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  1CEFB494
43798318    Anjie   Talent  Host    Star Host   Mngr. Lina  NINE AGENCY 19381364    ACTIVE  F500B90B
9616469 April   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    19EA7ADC
41339005    Arnel   Talent  Host    Rocket Host Mngr. Jean  NINE AGENCY 19381364    ACTIVE  F0ACC092
4498750 Boyeet  Talent  Host    Star Host   Mngr. Ely   NINE AGENCY 19381364    ACTIVE  4F0EF66B
26744344    Denj    Talent  Host    S idol  Mngr. Jean  SBJ AGENCY  -   ACTIVE  FA3434F6
2716708 Dhal    Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    69157DAF
20901441    Erich   Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  276F0D93
23500951    Gelica  Talent  Host    S idol  Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  AAA12B85
2886088 Gracia  Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    DD1AFBED
726356  HoneyLou    Talent  Host    Star Host   Mngr. Vine  SP AGENCY   -   ACTIVE  6E84814D
1089154 Jaa Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    52E6490A
8170164 Jaebum  Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  307430BF
29517964    Jake    Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    INCONSISTENT    801C8043
14508056    Javier  Talent  Host    -   Mngr. Myrill    -   -   INACTIVE    89DD1D34
45982313    Jey Em  Talent  Host    Star Host   Mngr. Myrill    NINE AGENCY 19381364    ACTIVE  03020D69
10417278    JLord   Talent  Host    Rocket Host Mngr. Myrill    NINE AGENCY 19381364    ACTIVE  0E4FEB46
68345832    Johnny  Talent  Host    Rocket Host Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  8C0B50B2
53065612    Joji    Talent  Host    Rocket Host Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  8745B2A2
51327969    Jolly   Talent  Host    Star Host   Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  57EED2C0
28207417    Junel   Talent  Host    Star Host   Mngr. Ely   BG AGENCY   -   ACTIVE  0F26A153
8081331 Katieyow    Talent  Host    S idol  Mngr. Jean  SBJ AGENCY  -   ACTIVE  C7599129
3613056 Katy    Talent  Host    -   Mngr. Yoshi NINE AGENCY 19381364    INCONSISTENT    60B4AD1F
5825737 Ken Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    D4079413
42205198    Khey Gee    Talent  Host    Star Host   Mngr. March LTMS AGENCY -   ACTIVE  17899EBC
65340031    Kimpoy  Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    2072465E
2711029 Kitty   Talent  Host    Star Host   Mngr. Lina  SBJ AGENCY  -   ACTIVE  E9790F3D
2339155 Kler    Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  7C693E52
8246228 Kuya July   Talent  Host    Star Host   Mngr. Jean  TEAM KJP    54654841    ACTIVE  349C2BAC
18898805    Lica    Talent  Host    Star Host   Mngr. Vine  NINE AGENCY 19381364    ACTIVE  BD016F81
11836486    Lin Talent  Host    S idol  Mngr. March NINE AGENCY 19381364    ACTIVE  D3D65103
50040181    Lyka    Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  AC91F636
17443588    Mai Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    ACTIVE  90FED491
30333133    Martin  Talent  Host    Rocket Host Mngr. Ely   NINE AGENCY 19381364    ACTIVE  0F34F257
2608827 Mikka   Talent  Host    -   -   NINE AGENCY 19381364    INCONSISTENT    E1CD8FFF
40158690    Nhics   Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  64B627BC
21302889    Nicky   Talent  Host    Star Host   Mngr. March NINE AGENCY 19381364    ACTIVE  D86CFF47
4728141 Nicole  Talent  Host    -   -   NINE AGENCY 19381364    INCONSISTENT    4940531E
2388108 Pamela  Talent  Host    S idol  Mngr. March LTMS AGENCY -   ACTIVE  5B6E0C1C
3095610 Primo   Talent  Host    Rocket Host Mngr. Ely   NINE AGENCY 19381364    ACTIVE  65B56B0E
30070500    Rosa    Talent  Host    S idol  Mngr. Yoshi NINE AGENCY 30070500    ACTIVE  3006D202
41841905    Scarlet Talent  Host    Star Host   Mngr. Nameless  NINE AGENCY 19381364    ACTIVE  86AD41B6
8724329 SexyLou Talent  Host    Star Host   Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  1646F797
19616782    Sky Talent  Host    S idol  Mngr. Nhiya TEAM NHIA   11155826    ACTIVE  20D93607
12810014    Summer  Talent  Host    Star Host   Mngr. Yoshi NINE AGENCY 19381364    ACTIVE  EE8169CB
4436945 TattooedMom Talent  Host    Star Host   -   NINE AGENCY 19381364    INACTIVE    AA42F20D
10862326    Tracy   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    72D493FF
6545736 Uno Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    5CC75E44
24786432    Wilab   Talent  Host    -   -   NINE AGENCY 19381364    INACTIVE    ACB760F8
5907650 Yanica  Talent  Host    Star Host   -   NINE AGENCY 19381364    ACTIVE  3E8E4869
15080341    Zeek    Talent  Host    Rocket Host Mngr. Jean  NINE AGENCY 15080341    INCONSISTENT    3E8E4852
3699745 YeJoon  Talent  Host    Star Host   Mngr. Yudi  NINE AGENCY 19381364    ACTIVE  B602A181
`;

function parseSalaryCategory(salary: string): BaseSalaryTier {
  if (!salary || salary === '-' || salary === 'N/A') return 'N/A';
  const s = salary.toLowerCase();
  if (s.includes('star')) return 'Star Host';
  if (s.includes('rocket')) return 'Rocket Host';
  if (s.includes('s idol')) return 'S idol';
  if (s.includes('esport')) return 'ESport Host';
  return 'N/A';
}

function parseStatus(status: string): HostStatus {
  if (!status) return 'Active';
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'Active';
  if (s === 'INACTIVE') return 'Inactive';
  if (s === 'INCONSISTENT') return 'Inconsistent';
  if (s === 'RELEASED') return 'Released';
  return 'Active';
}

function parseAnchorType(teamStr: string): AnchorType {
  if (!teamStr || teamStr === '-') return 'Nine Agency';
  const t = teamStr.toUpperCase();
  if (t.includes('NINE AGENCY') || t.includes('MISS NINE')) return 'Nine Agency';
  if (t.includes('AGENCY') || t.includes('TEAM') || t.includes('LTMS')) return 'Sub Agency';
  return 'External';
}

function parseRole(pos: string, role: string): Role {
  if (role && role.toLowerCase() === 'manager') return 'Manager';
  if (role && role.toLowerCase() === 'sub agent') return 'Agent';
  if (role && role.toLowerCase() === 'admin') return 'Admin';
  if (role && role.toLowerCase() === 'head admin') return 'Head Admin';
  if (pos && pos.toLowerCase().includes('director')) return 'Director';
  if (pos && pos.toLowerCase() === 'head admin') return 'Head Admin';
  if (pos && pos.toLowerCase() === 'manager') return 'Manager';
  if (pos && pos.toLowerCase() === 'sub agent') return 'Agent';
  if (pos && pos.toLowerCase() === 'admin') return 'Admin';
  return 'Talent';
}

function getLevelForRole(role: Role): number {
  switch (role) {
    case 'Director': return 99;
    case 'Head Admin': return 80;
    case 'Admin': return 70;
    case 'Manager': return 65;
    case 'Agent': return 55;
    default: return 30;
  }
}

function getTierForLevel(level: number): Tier {
  if (level >= 85) return 'S';
  if (level >= 65) return 'A';
  if (level >= 45) return 'B';
  if (level >= 25) return 'C';
  return 'X';
}

export function getStaticHosts(): Host[] {
  const parsedHosts: Host[] = [];

  // Parse Leaders
  const leaderLines = RAW_LEADERS_TEXT.trim().split('\n');
  for (const line of leaderLines) {
    const parts = line.split(/\t| {2,}/).map(p => p.trim());
    if (parts.length < 2) continue;

    const id = parts[0];
    const name = parts[1];
    const positionRaw = parts[2];
    const roleRaw = parts[3];
    const baseSalaryRaw = parts[4];
    const teamRaw = parts[5];
    const managerRaw = parts[6];
    const statusRaw = parts[7];
    const password = parts.at(-1);

    const role = parseRole(positionRaw, roleRaw);
    const level = getLevelForRole(role);
    const tier = getTierForLevel(level);

    parsedHosts.push({
      id: String(id),
      name: name,
      nickname: name,
      role: role,
      team: (!teamRaw || teamRaw === '-') ? 'Leadership' : teamRaw,
      manager: (!managerRaw || managerRaw === '-') ? 'None' : managerRaw,
      anchor_type: parseAnchorType(teamRaw),
      base_salary_category: parseSalaryCategory(baseSalaryRaw),
      status: parseStatus(statusRaw || 'ACTIVE'),
      level: level,
      tier: tier,
      password: String(password),
      is_temp_password: true,
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Parse Hosts
  const hostLines = RAW_HOSTS_TEXT.trim().split('\n');
  for (const line of hostLines) {
    const parts = line.split(/\t| {2,}/).map(p => p.trim());
    if (parts.length < 2) continue;

    const id = parts[0];
    const name = parts[1];
    const positionRaw = parts[2];
    const roleRaw = parts[3];
    const baseSalaryRaw = parts[4];
    const managerRaw = parts[5] ? parts[5].replace(/^Mngr\.\s+/i, '') : 'None';
    const teamRaw = parts[6];
    const statusRaw = parts[8];
    const password = parts[9];

    const role = 'Talent';
    const level = 30;
    const tier = 'B';

    parsedHosts.push({
      id: String(id),
      name: name,
      nickname: name,
      role: role,
      team: (!teamRaw || teamRaw === '-') ? 'Nine Agency' : teamRaw,
      manager: managerRaw === '-' ? 'None' : managerRaw,
      anchor_type: parseAnchorType(teamRaw),
      base_salary_category: parseSalaryCategory(baseSalaryRaw),
      status: parseStatus(statusRaw || 'ACTIVE'),
      level: level,
      tier: tier,
      password: String(password),
      is_temp_password: true,
      isActive: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return parsedHosts;
}
