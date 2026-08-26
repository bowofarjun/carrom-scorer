import React, { useEffect, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useAudioPlayer } from "expo-audio";

type Team = "A" | "B";
type Mode = "setup" | "toss" | "active";
type RotationMode = "auto" | "manual" | "none" | "set";
type Board = { 
  number: number; 
  winner: Team; 
  points: number; 
  queen: boolean; 
  duesA: number; 
  duesB: number;
  setNumber?: number;
  breakByName?: string;
  rotationHappened?: boolean;
  setWonBy?: Team | null;
  matchWonBy?: Team | null;
};
type Match = { type: "singles" | "doubles"; a: string; b: string; scores: { A: number; B: number }; board: number; setsTotal: number; currentSet: number; boardsPerSet: number; setScores: { A: number; B: number }; rotationMode: RotationMode; finalCrossoverDone: boolean; tieBreak: boolean; breakIndex: number; seats: string[]; dues: { A: number; B: number }; history: Board[] };

const C = { bg: "#121417", card: "#1A1D23", card2: "#252A34", text: "#F4F5F7", muted: "#9CA3AF", line: "#2D333F", amber: "#D97706", gold: "#FBBF24", green: "#059669", red: "#DC2626" };
const seats = ["North", "East", "South", "West"];
const defaultMatch: Match = { type: "singles", a: "Team 1", b: "Team 2", scores: { A: 0, B: 0 }, board: 1, setsTotal: 1, currentSet: 1, boardsPerSet: 8, setScores: { A: 0, B: 0 }, rotationMode: "set", finalCrossoverDone: false, tieBreak: false, breakIndex: 0, seats: ["Team 1", "", "Team 2", ""], dues: { A: 0, B: 0 }, history: [] };

export default function Index() {
  Object.assign(styles as Record<string, object>, { appbar: [styles.appbar, { flexWrap: "wrap", rowGap: 8 }], lightCard: lightStyles.card, lightControl: lightStyles.control, lightMuted: lightStyles.muted, lightRule: lightStyles.rule, optionRow: seriesStyles.optionRow, option: seriesStyles.option, optionActive: seriesStyles.optionActive, optionText: seriesStyles.optionText, rotationList: seriesStyles.rotationList, rotationOption: seriesStyles.rotationOption });
  const { width } = useWindowDimensions();
  const landscape = width > 700;
  const [mode, setMode] = useState<Mode>("setup");
  const [match, setMatch] = useState<Match>(defaultMatch);
  const [type, setType] = useState<"singles" | "doubles">("singles");
  const [setsTotal, setSetsTotal] = useState(1); const [boardsPerSet, setBoardsPerSet] = useState(8); const rotationMode: RotationMode = "set";
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [a2, setA2] = useState(""); const [b2, setB2] = useState("");
  const [toss, setToss] = useState<Team | null>(null); const [rules, setRules] = useState(false); const [showSeries, setShowSeries] = useState(false);
  const [winner, setWinner] = useState<Team | null>(null); const [men, setMen] = useState(5); const [queen, setQueen] = useState(false); const [queenEligible, setQueenEligible] = useState(true); const [soundOn, setSoundOn] = useState(true);
  const [themeDark, setThemeDark] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const chime = useAudioPlayer(require("../assets/chime.wav"));

  useEffect(() => { AsyncStorage.getItem("carrom-match").then((value) => { if (value) { setMatch({ ...defaultMatch, ...JSON.parse(value), rotationMode: "set" }); setMode("active"); } }).catch(() => undefined).finally(() => setHydrated(true)); }, []);
  useEffect(() => { if (mode === "active") AsyncStorage.setItem("carrom-match", JSON.stringify(match)); }, [match, mode]);
  
  const matchOver = match.setScores.A > Math.floor(match.setsTotal / 2) || match.setScores.B > Math.floor(match.setsTotal / 2);
  const matchWinnerName = match.setScores.A > match.setScores.B ? match.a : match.b;

  const start = () => {
    if (type === "singles") {
      const p1 = a.trim() || "Player 1"; const p2 = b.trim() || "Player 2";
      setMatch({ ...defaultMatch, type, a: p1, b: p2, setsTotal, boardsPerSet, rotationMode, seats: [p1, "", p2, ""] });
    } else {
      const p1 = a.trim() || "Player 1"; const p2 = b.trim() || "Player 2"; const p3 = a2.trim() || "Player 3"; const p4 = b2.trim() || "Player 4";
      setMatch({ ...defaultMatch, type, a: `${p1} & ${p3}`, b: `${p2} & ${p4}`, setsTotal, boardsPerSet, rotationMode, seats: [p1, p2, p3, p4] });
    }
    setMode("toss");
  };
  
  const launch = () => { if (!toss) return; Haptics.selectionAsync(); setMatch((m) => ({ ...m, breakIndex: toss === "A" ? 0 : 2 })); setMode("active"); };
  const adjustDue = (team: Team, amount: number) => setMatch((m) => ({ ...m, dues: { ...m.dues, [team]: Math.max(0, m.dues[team] + amount) } }));
  const rotate = (m: Match) => { const next = [...m.seats]; if (m.type === "singles") { [next[0], next[2]] = [next[2], next[0]]; } else { next.splice(0, 0, next.pop() as string); } return next; };
  
  const manualRotate = () => setMatch((m) => {
    const currentBreaker = m.seats[m.breakIndex];
    const newSeats = rotate(m);
    return { ...m, seats: newSeats, breakIndex: newSeats.indexOf(currentBreaker) };
  });
  
  const completeBoard = () => {
    if (!winner) return;

    const loser: Team = winner === "A" ? "B" : "A";
    const before = match.scores[winner]; 
    const base = men; 
    const queenValid = queen && queenEligible; 
    const bonus = queenValid && before < 22 ? 3 : 0; 
    const loserDues = match.dues[loser];
    const points = base + bonus + loserDues;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (soundOn) { try { chime.seekTo(0); chime.play(); } catch { /* ignore */ } }

    setMatch((m) => {
      // 1. Resolve scores & match state
      const newScoreA = winner === "A" ? m.scores.A + points : m.scores.A;
      const newScoreB = winner === "B" ? m.scores.B + points : m.scores.B;
      const isTieBreak = m.tieBreak;

      const scoreReached25 = newScoreA >= 25 || newScoreB >= 25;
      const boardLimitReached = m.boardsPerSet > 0 && m.board >= m.boardsPerSet;
      
      const tiedAfterBoards = boardLimitReached && newScoreA === newScoreB && !isTieBreak && !scoreReached25;
      const setDone = isTieBreak || scoreReached25 || (boardLimitReached && !tiedAfterBoards);

      let nextSetScores = { ...m.setScores };
      let setWinnerTeam: Team | null = null;
      
      if (setDone && !tiedAfterBoards) {
        if (newScoreA > newScoreB) { nextSetScores.A += 1; setWinnerTeam = "A"; }
        else if (newScoreB > newScoreA) { nextSetScores.B += 1; setWinnerTeam = "B"; }
      }

      const seriesDone = nextSetScores.A > Math.floor(m.setsTotal / 2) || nextSetScores.B > Math.floor(m.setsTotal / 2);
      const matchWinnerTeam = seriesDone ? (nextSetScores.A > nextSetScores.B ? "A" : "B") : null;

      // 2. Determine if physical rotation is needed
      const shouldRotate = setDone && !tiedAfterBoards && !seriesDone;
      const isFinalSet = m.currentSet === m.setsTotal;
      const scoreCrossed13 = newScoreA >= 13 || newScoreB >= 13;
      const needsCrossover = !setDone && isFinalSet && !m.finalCrossoverDone && 
          ((m.boardsPerSet > 0 && m.board === Math.floor(m.boardsPerSet / 2)) || scoreCrossed13);

      const newSeats = (shouldRotate || needsCrossover) ? rotate(m) : [...m.seats];

      // 3. SECURE BREAK ORDER LOGIC
      // Find out who opened the CURRENT set we are playing
      let currentSetOpenerName = m.history.find(b => b.setNumber === m.currentSet && b.number === 1)?.breakByName;
      if (!currentSetOpenerName) {
        currentSetOpenerName = m.seats[m.breakIndex]; // Fallback if resolving the very 1st board
      }

      let targetBreakerName = "";
      
      if (shouldRotate) {
        // SET BOUNDARY: Find the opener for the NEXT set
        if (m.type === "singles") {
          targetBreakerName = m.seats.find(s => s !== "" && s !== currentSetOpenerName) || m.seats[0];
        } else {
          const currentOpenerIndex = m.seats.indexOf(currentSetOpenerName);
          targetBreakerName = m.seats[(currentOpenerIndex + 1) % 4];
        }
      } else {
        // WITHIN A SET: Normal board-to-board alternation
        targetBreakerName = m.type === "singles" ? m.seats[m.breakIndex === 0 ? 2 : 0] : m.seats[(m.breakIndex + 1) % 4];
      }

      // 4. Find the next breaker's index in the NEW seating arrangement (with 0 failsafe)
      const nextBreakIndex = Math.max(0, newSeats.indexOf(targetBreakerName));
      const currentBreakByName = m.seats[m.breakIndex];

      return {
        ...m,
        scores: setDone && !tiedAfterBoards ? { A: 0, B: 0 } : { A: newScoreA, B: newScoreB },
        tieBreak: tiedAfterBoards,
        setScores: nextSetScores,
        currentSet: shouldRotate ? m.currentSet + 1 : m.currentSet,
        board: shouldRotate ? 1 : m.board + 1,
        finalCrossoverDone: shouldRotate ? false : (needsCrossover ? true : m.finalCrossoverDone),
        breakIndex: nextBreakIndex,
        seats: newSeats,
        history: [...m.history, { 
          number: m.board, 
          setNumber: m.currentSet,
          winner, 
          points, 
          queen: queenValid, 
          duesA: m.dues.A, 
          duesB: m.dues.B,
          breakByName: currentBreakByName,
          rotationHappened: shouldRotate || needsCrossover,
          setWonBy: setWinnerTeam,
          matchWonBy: matchWinnerTeam
        }],
        dues: { A: 0, B: 0 }
      };
    });
    
    setMen(1); setQueen(false); setQueenEligible(true); setWinner(null);
  };

  const reset = () => { const doReset = () => { AsyncStorage.removeItem("carrom-match"); setMatch(defaultMatch); setMode("setup"); setA(""); setB(""); setA2(""); setB2(""); setToss(null); setWinner(null); setMen(1); setQueen(false); setQueenEligible(true); }; if (Platform.OS === "web") { if (typeof window !== "undefined" && window.confirm("Start a new match?\n\nThe current board history will be cleared.")) doReset(); return; } Alert.alert("Start a new match?", "The current board history will be cleared.", [{ text: "Cancel", style: "cancel" }, { text: "New match", style: "destructive", onPress: doReset }]); };

  if (!hydrated) return <SafeAreaView style={styles.safe}><View style={loadingStyles.container}><MaterialCommunityIcons name="database-sync-outline" size={28} color={C.gold} /><Text style={loadingStyles.text}>Checking saved match…</Text></View></SafeAreaView>;
  return <SafeAreaView style={[styles.safe, !themeDark && styles.lightSurface]}>
    <View style={[styles.appbar, !themeDark && lightStyles.surface]}><View><Text style={styles.kicker}>ICF SCOREKEEPER</Text><Text style={[styles.title, !themeDark && lightStyles.text]}>Carrom Match Assistant</Text></View><View style={styles.appActions}><IconButton icon={soundOn ? "volume-high" : "volume-off"} label="Toggle sound" testID="sound-toggle" onPress={() => setSoundOn((v) => !v)} /><IconButton icon={themeDark ? "weather-sunny" : "weather-night"} label="Toggle theme" testID="theme-toggle" onPress={() => setThemeDark((value) => !value)} /><IconButton icon="format-list-numbered" label="Series settings" testID="series-settings" onPress={() => setShowSeries(true)} />{mode === "active" && match.rotationMode === "manual" && <IconButton icon="rotate-right" label="Rotate players" testID="manual-rotate" onPress={manualRotate} />}<IconButton icon="book-open-variant" label="Open ICF rules" testID="rules-button" onPress={() => setRules(true)} /><IconButton icon="refresh" label="Start new match" testID="new-match-button" onPress={reset} /></View></View>
    {mode === "setup" && <Setup light={!themeDark} type={type} setType={setType} a={a} b={b} a2={a2} b2={b2} setA={setA} setB={setB} setA2={setA2} setB2={setB2} start={start} />}
    {mode === "toss" && <Toss light={!themeDark} match={match} toss={toss} setToss={setToss} launch={launch} />}
    {mode === "active" && <><SeriesStatus match={match} light={!themeDark} /><Active light={!themeDark} match={match} landscape={landscape} matchOver={matchOver} matchWinnerName={matchWinnerName} winner={winner} setWinner={setWinner} men={men} setMen={setMen} queen={queen} setQueen={setQueen} queenEligible={queenEligible} setQueenEligible={setQueenEligible} adjustDue={adjustDue} complete={completeBoard} /></>}
    <Modal visible={showSeries} animationType="slide" transparent onRequestClose={() => setShowSeries(false)}><View style={styles.modalShade}><View style={[styles.sheet, !themeDark && styles.lightCard]}><View style={styles.sheetHead}><Text style={[styles.h2, !themeDark && styles.lightText]}>Series settings</Text><IconButton icon="close" label="Close series settings" onPress={() => setShowSeries(false)} /></View><Text style={styles.label}>SETS IN SERIES</Text><View style={styles.optionRow}>{[1, 3, 5].map((value) => <Pressable key={value} testID={`sets-${value}`} style={[styles.option, !themeDark && styles.lightCard, setsTotal === value && (themeDark ? styles.optionActive : styles.optionActiveLight)]} onPress={() => setSetsTotal(value)}><Text style={[styles.optionText, !themeDark && styles.lightText]}>{value === 1 ? "Single" : `Best of ${value}`}</Text></Pressable>)}</View><Text style={styles.label}>BOARDS PER SET</Text><View style={styles.optionRow}><Pressable testID="boards-8" style={[styles.option, !themeDark && styles.lightCard, boardsPerSet === 8 && (themeDark ? styles.optionActive : styles.optionActiveLight)]} onPress={() => setBoardsPerSet(8)}><Text style={[styles.optionText, !themeDark && styles.lightText]}>8 boards</Text></Pressable><Pressable testID="boards-unlimited" style={[styles.option, !themeDark && styles.lightCard, boardsPerSet === 0 && (themeDark ? styles.optionActive : styles.optionActiveLight)]} onPress={() => setBoardsPerSet(0)}><Text style={[styles.optionText, !themeDark && styles.lightText]}>Unlimited</Text></Pressable></View><Text style={[styles.muted, !themeDark && styles.lightMuted]}>Unlimited ends only when a team reaches 25 points; board numbers are not counted.</Text><Text style={styles.label}>ROTATION</Text><View style={styles.rotationList}><Pressable testID="rotation-set" style={[styles.rotationOption, !themeDark && styles.lightCard, rotationMode === "set" && (themeDark ? styles.optionActive : styles.optionActiveLight)]}><View style={[styles.radio, rotationMode === "set" && styles.radioActive]}>{rotationMode === "set" && <View style={styles.radioDot} />}</View><Text style={[styles.optionText, !themeDark && styles.lightText]}>Rotate after each set & halfway crossover</Text></Pressable></View><Pressable testID="save-series-settings" style={styles.primary} onPress={() => setShowSeries(false)}><Text style={styles.primaryText}>Save series settings</Text></Pressable></View></View></Modal><Modal visible={rules} animationType="slide" transparent onRequestClose={() => setRules(false)}><View style={styles.modalShade}><View style={[styles.sheet, !themeDark && styles.lightCard]}><View style={styles.sheetHandle} /><View style={styles.sheetHead}><Text style={[styles.h2, !themeDark && styles.lightText]}>ICF rules reference</Text><IconButton icon="close" label="Close rules" testID="close-rules" onPress={() => setRules(false)} /></View><ScrollView showsVerticalScrollIndicator={false}><Rule light={!themeDark} icon="trophy-outline" title="Match target" body="First team to 25 points wins. If neither reaches 25, the highest score after 8 boards wins." /><Rule light={!themeDark} icon="counter" title="Board scoring" body="The board winner receives 1 point for each opponent carrom man remaining, from 1 to 9." /><Rule light={!themeDark} icon="crown-outline" title="Queen cover" body="Add 3 points for a covered queen only when the winner has under 22 points before scoring." /><Rule light={!themeDark} icon="rotate-3d-variant" title="Rotation & Crossover" body="Singles swap North/South; Doubles rotate all four seats clockwise after each set. Final set crossover occurs at 13 points or 4 boards completed." /><Rule light={!themeDark} icon="alert-circle-outline" title="Dues & fouls" body="Losing team's unrecovered dues are converted to penalty points and added to the winner." /><Pressable testID="official-rules-link" accessibilityRole="link" style={styles.outlineBtn} onPress={() => Linking.openURL("https://www.indiancarrom.co.in/laws-of-carrom/")}><Text style={styles.outlineText}>Official ICF rules</Text><MaterialCommunityIcons name="open-in-new" size={17} color={C.gold} /></Pressable></ScrollView></View></View></Modal>
  </SafeAreaView>;
}

function Setup({ light, type, setType, a, b, a2, b2, setA, setB, setA2, setB2, start }: any) { return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.hero}><View style={styles.badge}><MaterialCommunityIcons name="target" size={20} color={C.gold} /></View><Text style={[styles.h1, light && styles.lightText]}>Set the board.</Text><Text style={[styles.sub, light && styles.lightMuted]}>Configure your match before the first break.</Text></View><Text style={[styles.label, light && styles.lightMuted]}>MATCH FORMAT</Text><View style={[styles.segment, light && styles.lightCard]}><Pressable testID="singles-selector" accessibilityRole="button" style={[styles.segmentItem, type === "singles" && styles.segmentActive]} onPress={() => setType("singles")}><Text style={[styles.segmentText, type === "singles" && styles.segmentTextActive]}>Singles</Text><Text style={styles.segmentHint}>1 v 1</Text></Pressable><Pressable testID="doubles-selector" accessibilityRole="button" style={[styles.segmentItem, type === "doubles" && styles.segmentActive]} onPress={() => setType("doubles")}><Text style={[styles.segmentText, type === "doubles" && styles.segmentTextActive]}>Doubles</Text><Text style={styles.segmentHint}>2 v 2</Text></Pressable></View>{type === "singles" ? <><Text style={[styles.label, light && styles.lightMuted]}>PLAYERS</Text><Field light={light} label="Player 1 · North" value={a} onChangeText={setA} icon="account-outline" /><Field light={light} label="Player 2 · South" value={b} onChangeText={setB} icon="account-outline" /></> : <><Text style={[styles.label, light && styles.lightMuted]}>TEAM 1 PARTNERS</Text><Field light={light} label="Team 1 · Player at North" value={a} onChangeText={setA} icon="account-outline" /><Field light={light} label="Team 1 · Player at South" value={a2} onChangeText={setA2} icon="account-outline" /><Text style={[styles.label, light && styles.lightMuted]}>TEAM 2 PARTNERS</Text><Field light={light} label="Team 2 · Player at East" value={b} onChangeText={setB} icon="account-outline" /><Field light={light} label="Team 2 · Player at West" value={b2} onChangeText={setB2} icon="account-outline" /></>}<View style={styles.infoCard}><MaterialCommunityIcons name="shield-check-outline" size={21} color={C.green} /><Text style={styles.infoText}>ICF scoring rules are active. Match cap: 25 points or 8 boards.</Text></View><Pressable testID="proceed-to-toss" accessibilityRole="button" style={styles.primary} onPress={start}><Text style={styles.primaryText}>Proceed to toss</Text><MaterialCommunityIcons name="arrow-right" size={20} color="#fff" /></Pressable></ScrollView></KeyboardAvoidingView>; }
function Toss({ light, match, toss, setToss, launch }: any) { return <ScrollView contentContainerStyle={styles.content}><View style={styles.hero}><Text style={styles.eyebrow}>BOARD 01 · PREPARE</Text><Text style={[styles.h1, light && styles.lightText]}>Who has the break?</Text><Text style={[styles.sub, light && styles.lightMuted]}>Select the toss winner to assign the opening white break.</Text></View><View style={[styles.tossCard, light && styles.lightCard]}><View style={[styles.coin, light && styles.coinLight]}><MaterialCommunityIcons name="lightning-bolt" size={32} color={C.gold} /></View><Text style={[styles.coinTitle, light && styles.lightText]}>Opening white break</Text><Text style={[styles.sub, light && styles.lightMuted]}>The break alternates between players/teams from board to board.</Text></View><Text style={[styles.label, light && styles.lightMuted]}>TOSS WINNER</Text><View style={styles.choiceRow}><Choice light={light} testID="toss-team-a" name={match.a} active={toss === "A"} onPress={() => setToss("A")} /><Choice light={light} testID="toss-team-b" name={match.b} active={toss === "B"} onPress={() => setToss("B")} /></View><Pressable testID="start-board" style={[styles.primary, !toss && styles.disabled]} disabled={!toss} onPress={launch}><Text style={styles.primaryText}>Start board 1</Text><MaterialCommunityIcons name="play" size={20} color="#fff" /></Pressable></ScrollView>; }
function SeriesStatus({ match, light }: any) { const boardLabel = match.boardsPerSet === 0 ? `Board ${match.board} · unlimited` : match.tieBreak ? `Board ${match.board} · Tie-Break` : `Board ${Math.min(match.board, match.boardsPerSet)} of ${match.boardsPerSet}`; return <View style={[seriesStatusStyles.wrap, light && lightStyles.card]}><View><Text style={[styles.eyebrow, { marginBottom: 3 }]}>SET {match.currentSet} OF {match.setsTotal}{match.currentSet === match.setsTotal && match.finalCrossoverDone ? " · Final Set (Post-Crossover)" : match.currentSet === match.setsTotal ? " · Final Set" : ""}</Text><Text style={[seriesStatusStyles.board, light && lightStyles.text]}>{boardLabel}</Text></View><View style={seriesStatusStyles.score}><Text style={[seriesStatusStyles.scoreText, light && lightStyles.text]}>{match.setScores.A} — {match.setScores.B}</Text><Text style={[styles.muted, light && lightStyles.muted]}>sets won</Text></View></View>; }
function Active({ light, match, landscape, matchOver, matchWinnerName, winner, setWinner, men, setMen, queen, setQueen, queenEligible, setQueenEligible, adjustDue, complete }: any) { return <ScrollView contentContainerStyle={[styles.activeContent, landscape && styles.landscape]}><View style={styles.scoreHeader}><View><Text style={styles.eyebrow}>{matchOver ? "MATCH COMPLETE" : match.boardsPerSet === 0 ? `BOARD ${String(match.board).padStart(2, "0")} · UNLIMITED` : match.tieBreak ? `BOARD ${String(match.board).padStart(2, "0")} · TIE-BREAK` : `BOARD ${String(Math.min(match.board, match.boardsPerSet)).padStart(2, "0")} OF ${String(match.boardsPerSet).padStart(2, "0")}`}</Text><Text style={[styles.h2, light && styles.lightText]}>{matchOver ? `${matchWinnerName} takes it` : "Live match"}</Text></View><View style={styles.liveDot}><View style={styles.dot} /><Text style={styles.liveText}>LIVE</Text></View></View><View style={styles.scoreRow}><Score light={light} name={match.a} score={match.scores.A} leader={match.scores.A > match.scores.B} /><Score light={light} name={match.b} score={match.scores.B} leader={match.scores.B > match.scores.A} /></View><View style={styles.boardCard}><BoardGraphic match={match} /></View><View style={styles.columns}><View style={styles.controlCol}><Text style={[styles.label, light && styles.lightMuted]}>BOARD DUES</Text><View style={styles.duesRow}><Due light={light} team="A" name={match.a} value={match.dues.A} adjustDue={adjustDue} /><Due light={light} team="B" name={match.b} value={match.dues.B} adjustDue={adjustDue} /></View><Text style={[styles.label, light && styles.lightMuted]}>RESOLVE BOARD {match.board}</Text><View style={[styles.panel, light && styles.lightCard]}><Text style={[styles.panelTitle, light && styles.lightText]}>Board winner</Text><View style={styles.choiceRow}><Choice light={light} testID="winner-a" name={match.a} active={winner === "A"} onPress={() => setWinner("A")} compact /><Choice light={light} testID="winner-b" name={match.b} active={winner === "B"} onPress={() => setWinner("B")} compact /></View><View style={styles.stepRow}><View><Text style={[styles.panelTitle, light && styles.lightText]}>Opponent men left</Text><Text style={[styles.muted, light && styles.lightMuted]}>1 to 9 coins</Text></View><View style={styles.stepper}><Pressable testID="men-decrement" style={[styles.stepBtn, light && styles.lightControl]} onPress={() => setMen(Math.max(1, men - 1))}><Text style={[styles.stepText, light && styles.lightText]}>−</Text></Pressable><Text testID="men-count" style={styles.stepValue}>{men}</Text><Pressable testID="men-increment" style={[styles.stepBtn, light && styles.lightControl]} onPress={() => setMen(Math.min(9, men + 1))}><Text style={[styles.stepText, light && styles.lightText]}>+</Text></Pressable></View></View><Pressable testID="queen-toggle" accessibilityRole="switch" style={styles.switchRow} onPress={() => setQueen(!queen)}><View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.panelTitle, light && styles.lightText]}>Queen covered</Text><Text style={[styles.muted, light && styles.lightMuted]}>{winner ? (winner === "A" ? match.a : match.b) : "Select winner to"} score +3 if under 22</Text></View><Switch value={queen} onValueChange={setQueen} trackColor={{ false: C.card2, true: C.amber }} thumbColor={queen ? C.gold : C.muted} /></Pressable>{queen && <Pressable testID="queen-eligible-toggle" accessibilityRole="switch" style={[styles.subSwitchRow, light && styles.lightCard]} onPress={() => setQueenEligible(!queenEligible)}><View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.panelTitle, light && styles.lightText]}>Own coin pocketed first</Text><Text style={[styles.muted, light && styles.lightMuted]}>ICF: Queen only counts if winner had already pocketed at least one own coin. Bonus is void otherwise.</Text>{!queenEligible && <Text testID="queen-void-note" style={styles.warnText}>Queen disallowed · no +3 bonus</Text>}</View><Switch value={queenEligible} onValueChange={setQueenEligible} trackColor={{ false: C.card2, true: C.amber }} thumbColor={queenEligible ? C.gold : C.muted} /></Pressable>}<Pressable testID="complete-board" accessibilityRole="button" style={[styles.primary, (matchOver || !winner) && styles.disabled, { marginTop: 8 }]} disabled={matchOver || !winner} onPress={complete}><Text style={styles.primaryText}>Complete board & rotate</Text><MaterialCommunityIcons name="rotate-right" size={20} color="#fff" /></Pressable></View></View><History light={light} history={match.history} names={{ A: match.a, B: match.b }} /></View></ScrollView>; }
function BoardGraphic({ match }: any) {
  return (
    <View style={styles.board}>
      <View style={styles.pocketTL} />
      <View style={styles.pocketTR} />
      <View style={styles.pocketBL} />
      <View style={styles.pocketBR} />
      <View style={styles.boardCenter}>
        <View style={styles.ring} />
        <View style={styles.coinRed} />
        <View style={styles.coinWhite} />
        <View style={styles.coinBlack} />
      </View>
      {match.seats.map((name: string, i: number) =>
        name ? (
          <View key={i} style={[styles.seat, i === 0 ? styles.north : i === 1 ? styles.east : i === 2 ? styles.south : styles.west]}>
            <View style={[styles.seatBadge, i === match.breakIndex && styles.breakBadge]}>
              <Text style={styles.seatText}>{name}</Text>
              {i === match.breakIndex && <MaterialCommunityIcons name="lightning-bolt" size={13} color={C.gold} />}
            </View>
            <Text style={styles.seatLabel}>{seats[i]}</Text>
          </View>
        ) : null
      )}
    </View>
  );
}

function History({ light, history, names }: any) { 
  return (
    <View style={styles.history}>
      <View style={styles.historyHead}>
        <Text style={[styles.label, light && styles.lightMuted]}>BOARD HISTORY</Text>
        <Text style={[styles.muted, light && styles.lightMuted]}>{history.length} completed</Text>
      </View>
      {history.length === 0 ? (
        <Text style={[styles.empty, light && styles.lightCard, light && styles.lightMuted]}>Completed boards will appear here.</Text>
      ) : (
        history.slice().reverse().map((b: Board, index: number) => (
          <View key={`${b.setNumber || 0}-${b.number}-${index}`} style={{ marginBottom: 4 }}>
            {b.matchWonBy && (
               <View style={styles.historyEvent}>
                 <MaterialCommunityIcons name="crown" size={18} color={C.gold} />
                 <Text style={[styles.historyEventText, { color: C.gold, fontSize: 14, fontWeight: '900' }]}>
                   Match won by {names?.[b.matchWonBy] ?? `Team ${b.matchWonBy}`}
                 </Text>
               </View>
            )}

            {b.setWonBy && (
               <View style={styles.historyEvent}>
                 <MaterialCommunityIcons name="trophy-variant" size={14} color={C.gold} />
                 <Text style={[styles.historyEventText, { color: C.gold }]}>
                   Set {b.setNumber} won by {names?.[b.setWonBy] ?? `Team ${b.setWonBy}`}
                 </Text>
               </View>
            )}

            {b.rotationHappened && (
               <View style={styles.historyEvent}>
                 <MaterialCommunityIcons name="rotate-3d-variant" size={14} color={C.muted} />
                 <Text style={styles.historyEventText}>
                   {b.setWonBy ? "Players Rotated (Set Change)" : "Players Rotated (Halfway Crossover)"}
                 </Text>
               </View>
            )}

            <View style={[styles.historyItem, light && styles.lightCard]}>
              <View style={styles.historyNum}>
                <Text style={styles.historyNumText}>{String(b.number).padStart(2, "0")}</Text>
              </View>
              <View style={styles.historyMain}>
                <Text style={[styles.historyTitle, light && styles.lightText]}>
                  {names?.[b.winner] ?? `Team ${b.winner}`} won board
                </Text>
                <Text style={[styles.muted, light && styles.lightMuted]}>
                  {b.points} points · {b.queen ? "Queen covered" : "No queen bonus"}
                </Text>
                {b.breakByName && (
                  <Text style={[styles.muted, light && styles.lightMuted, { marginTop: 2, fontSize: 11 }]}>
                    Break: {b.breakByName}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.historyPoints}>+{b.points}</Text>
                {b.setNumber && (
                  <Text style={[styles.muted, light && styles.lightMuted, { fontSize: 10, marginTop: 4, fontWeight: '700' }]}>
                    SET {b.setNumber}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  ); 
}

function Score({ light, name, score, leader }: any) { 
  return <View style={[styles.scoreBox, light && styles.lightCard, leader && (light ? styles.scoreLeaderLight : styles.scoreLeader)]}>
    <Text numberOfLines={2} style={[styles.scoreName, light && styles.lightMuted]}>{name}</Text>
    <Text style={[styles.score, light && styles.lightText]}>{score}</Text>
    {leader && <Text style={[styles.leading, light && styles.leadingLight]}>LEADING</Text>}
  </View>; 
}
function Due({ light, team, name, value, adjustDue }: any) { return <View style={[styles.due, light && styles.lightCard]}><View><Text style={[styles.panelTitle, light && styles.lightText]}>{name}</Text><Text style={[styles.muted, light && styles.lightMuted]}>Team {team}</Text></View><View style={styles.dueControl}><Pressable testID={`due-${team}-decrement`} style={[styles.smallBtn, light && styles.lightControl]} onPress={() => adjustDue(team, -1)}><Text style={[styles.stepText, light && styles.lightText]}>−</Text></Pressable><Text testID={`due-${team}-count`} style={[styles.dueValue, light && styles.lightText, value > 0 && { color: C.gold }]}>{value}</Text><Pressable testID={`due-${team}-increment`} style={[styles.smallBtn, light && styles.lightControl]} onPress={() => adjustDue(team, 1)}><Text style={[styles.stepText, light && styles.lightText]}>+</Text></Pressable></View></View>; }
function Choice({ light, name, active, onPress, compact, testID }: any) { return <Pressable testID={testID} accessibilityRole="radio" accessibilityLabel={name} style={[styles.choice, light && styles.lightCard, compact && styles.choiceCompact, active && (light ? styles.choiceActiveLight : styles.choiceActive)]} onPress={onPress}><View style={[styles.radio, active && styles.radioActive]}><View style={styles.radioDot} /></View><Text style={[styles.choiceText, light && styles.lightText]} numberOfLines={1}>{name}</Text></Pressable>; }
function Field({ light, label, value, onChangeText, icon }: any) { return <View style={[styles.field, light && styles.lightCard]}><MaterialCommunityIcons name={icon} size={21} color={light ? "#475569" : C.muted} /><TextInput testID={`input-${label}`} accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={light ? "#64748B" : "#68707d"} style={[styles.input, { color: light ? "#0F172A" : C.text }]} /></View>; }
function IconButton({ icon, onPress, label, testID }: any) { return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label ?? icon} style={[styles.iconBtn, testID === "close-rules" && { position: Platform.OS === "web" ? ("fixed" as any) : "absolute", top: 12, right: 12, zIndex: 100 }]} onPress={onPress}><MaterialCommunityIcons name={icon} size={21} color={C.text} /></Pressable>; }
function Rule({ light, icon, title, body }: any) { const correctedBody = body.replace("Doubles rotate all four seats clockwise after every board.", "Doubles rotate all four seats clockwise after each completed set."); return <View style={[styles.rule, light && styles.lightRule]}><View style={styles.ruleIcon}><MaterialCommunityIcons name={icon} size={21} color={C.gold} /></View><View style={styles.ruleCopy}><Text style={[styles.panelTitle, light && styles.lightText]}>{title}</Text><Text style={[styles.ruleBody, light && styles.lightMuted]}>{correctedBody}</Text></View></View>; }

const lightStyles = StyleSheet.create({ surface: { backgroundColor: "#F8FAFC" }, text: { color: "#0F172A" }, muted: { color: "#475569" }, card: { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" }, control: { backgroundColor: "#E2E8F0" }, rule: { borderBottomColor: "#CBD5E1" } });
const seriesStyles = StyleSheet.create({ optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }, option: { minHeight: 44, paddingHorizontal: 13, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, justifyContent: "center" }, optionActive: { backgroundColor: "#302316", borderColor: C.amber }, optionText: { color: C.text, fontSize: 13, fontWeight: "700" }, rotationList: { gap: 8, marginBottom: 18 }, rotationOption: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", gap: 10 } });
const seriesStatusStyles = StyleSheet.create({ wrap: { marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", gap: 16 }, board: { color: C.text, fontSize: 15, fontWeight: "800" }, score: { marginLeft: "auto", alignItems: "flex-end" }, scoreText: { color: C.gold, fontSize: 18, fontWeight: "900" }, crossover: { position: "absolute", right: 12, bottom: 4, color: C.gold, fontSize: 8, fontWeight: "900", letterSpacing: 1 } });
const loadingStyles = StyleSheet.create({ container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, text: { color: C.muted, fontSize: 14 } });
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, lightSurface: { backgroundColor: "#F8FAFC" }, lightText: { color: "#0F172A" }, flex: { flex: 1 }, appbar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.line }, appActions: { flexDirection: "row", gap: 8 }, iconBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.card }, kicker: { color: C.gold, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }, title: { color: C.text, fontSize: 18, fontWeight: "800", marginTop: 3 }, content: { padding: 20, paddingBottom: 48, maxWidth: 620, width: "100%", alignSelf: "center" }, activeContent: { padding: 20, paddingBottom: 48, maxWidth: 900, width: "100%", alignSelf: "center" }, landscape: { paddingHorizontal: 28 }, hero: { marginTop: 22, marginBottom: 28 }, badge: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#372712", alignItems: "center", justifyContent: "center", marginBottom: 16 }, h1: { color: C.text, fontSize: 32, fontWeight: "800", letterSpacing: -1 }, h2: { color: C.text, fontSize: 23, fontWeight: "800" }, sub: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 7 }, eyebrow: { color: C.gold, fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginBottom: 8 }, label: { color: C.muted, fontSize: 11, letterSpacing: 1.2, fontWeight: "800", marginBottom: 10, marginTop: 8 }, segment: { flexDirection: "row", backgroundColor: C.card, borderRadius: 16, padding: 4, marginBottom: 26 }, segmentItem: { flex: 1, minHeight: 58, padding: 10, borderRadius: 13, alignItems: "center", justifyContent: "center" }, segmentActive: { backgroundColor: C.amber }, segmentText: { color: C.muted, fontSize: 15, fontWeight: "700" }, segmentTextActive: { color: "#fff" }, segmentHint: { color: "#7d8591", fontSize: 11, marginTop: 3 }, field: { height: 56, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12 }, input: { flex: 1, color: C.text, fontSize: 15, marginLeft: 12 }, infoCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#10251f", borderRadius: 14, padding: 15, marginTop: 10, marginBottom: 26 }, infoText: { color: "#a7d8c8", flex: 1, fontSize: 13, lineHeight: 18 }, primary: { minHeight: 54, backgroundColor: C.amber, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 18 }, primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" }, disabled: { opacity: .4 }, tossCard: { backgroundColor: C.card, borderRadius: 20, padding: 26, alignItems: "center", borderWidth: 1, borderColor: C.line, marginBottom: 28 }, coin: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#372712", borderWidth: 1, borderColor: C.amber, alignItems: "center", justifyContent: "center", marginBottom: 16 }, coinTitle: { color: C.text, fontWeight: "800", fontSize: 18 }, choiceRow: { flexDirection: "row", gap: 10, marginBottom: 20 }, choice: { flex: 1, minHeight: 54, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 }, choiceCompact: { minHeight: 48 }, choiceActive: { borderColor: C.amber, backgroundColor: "#302316" }, choiceActiveLight: { borderColor: C.amber, backgroundColor: "#FEF3E2" }, coinLight: { backgroundColor: "#FEF3E2" }, optionActiveLight: { backgroundColor: "#FEF3E2", borderColor: C.amber }, choiceText: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 }, radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: C.muted, alignItems: "center", justifyContent: "center" }, radioActive: { borderColor: C.gold }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.gold }, scoreHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }, liveDot: { backgroundColor: "#17251f", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }, liveText: { color: "#8bd5bd", fontSize: 10, fontWeight: "800" }, scoreRow: { flexDirection: "row", gap: 12, marginBottom: 16 }, scoreBox: { flex: 1, backgroundColor: C.card, borderRadius: 17, minHeight: 104, padding: 16, borderWidth: 1, borderColor: C.line }, scoreLeader: { borderColor: C.amber, backgroundColor: "#2a2117" }, scoreLeaderLight: { borderColor: C.amber, backgroundColor: "#FEF3E2" }, leadingLight: { color: "#8D5B2A" }, scoreName: { color: C.muted, fontSize: 13, fontWeight: "700" }, score: { color: C.text, fontSize: 44, lineHeight: 52, fontWeight: "900", marginTop: 3 }, leading: { color: C.gold, fontSize: 9, fontWeight: "900", letterSpacing: 1 }, boardCard: { backgroundColor: "#17130e", borderRadius: 20, borderWidth: 1, borderColor: "#62451f", padding: 15, marginBottom: 25 }, board: { height: 280, backgroundColor: "#9c6a36", borderRadius: 13, borderWidth: 8, borderColor: "#543419", position: "relative", overflow: "hidden" }, pocketTL: { position: "absolute", width: 25, height: 25, borderRadius: 15, backgroundColor: "#17130e", top: 7, left: 7 }, pocketTR: { position: "absolute", width: 25, height: 25, borderRadius: 15, backgroundColor: "#17130e", top: 7, right: 7 }, pocketBL: { position: "absolute", width: 25, height: 25, borderRadius: 15, backgroundColor: "#17130e", bottom: 7, left: 7 }, pocketBR: { position: "absolute", width: 25, height: 25, borderRadius: 15, backgroundColor: "#17130e", bottom: 7, right: 7 }, boardCenter: { position: "absolute", left: "50%", top: "50%", marginLeft: -45, marginTop: -45, width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#d8a45d", alignItems: "center", justifyContent: "center" }, ring: { width: 38, height: 38, borderRadius: 20, borderWidth: 2, borderColor: "#d8a45d" }, coinRed: { position: "absolute", width: 14, height: 14, borderRadius: 8, backgroundColor: "#a72f24" }, coinWhite: { position: "absolute", width: 12, height: 12, borderRadius: 7, backgroundColor: "#f5dfbd", left: 20, top: 22 }, coinBlack: { position: "absolute", width: 12, height: 12, borderRadius: 7, backgroundColor: "#26201a", right: 20, bottom: 22 }, seat: { position: "absolute", alignItems: "center" }, north: { top: 12, left: 0, right: 0 }, south: { bottom: 12, left: 0, right: 0 }, east: { right: 10, top: "43%" }, west: { left: 10, top: "43%" }, seatBadge: { maxWidth: 105, backgroundColor: "#302316", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 3, borderWidth: 1, borderColor: "#c18a44" }, breakBadge: { backgroundColor: "#4b2c09", borderColor: C.gold }, seatText: { color: "#fff1d3", fontSize: 10, fontWeight: "800" }, seatLabel: { color: "#5d3c1e", fontSize: 9, marginTop: 2, fontWeight: "800", textTransform: "uppercase" }, columns: {}, controlCol: {}, duesRow: { flexDirection: "row", gap: 10, marginBottom: 24 }, due: { flex: 1, backgroundColor: C.card, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: C.line }, panelTitle: { color: C.text, fontSize: 14, fontWeight: "800" }, muted: { color: C.muted, fontSize: 12, marginTop: 4 }, dueControl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 13 }, smallBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }, dueValue: { color: C.text, fontSize: 20, fontWeight: "900" }, panel: { backgroundColor: C.card, borderRadius: 17, padding: 16, borderWidth: 1, borderColor: C.line, marginBottom: 24 }, stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 17, marginTop: 2 }, stepper: { flexDirection: "row", alignItems: "center", gap: 12 }, stepBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }, stepText: { color: C.text, fontSize: 22, lineHeight: 24 }, stepValue: { color: C.gold, fontWeight: "900", fontSize: 20, minWidth: 20, textAlign: "center" }, switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 18 }, subSwitchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, marginTop: 6 }, warnText: { color: C.red, fontSize: 11, fontWeight: "800", marginTop: 6 }, history: { marginTop: 4 }, historyHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, empty: { color: C.muted, backgroundColor: C.card, borderRadius: 14, padding: 18, marginTop: 2 }, historyItem: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderRadius: 14, padding: 12, marginTop: 8 }, historyNum: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#302316", alignItems: "center", justifyContent: "center" }, historyNumText: { color: C.gold, fontWeight: "900", fontSize: 12 }, historyMain: { flex: 1, marginLeft: 11 }, historyTitle: { color: C.text, fontSize: 13, fontWeight: "800" }, historyPoints: { color: C.gold, fontSize: 17, fontWeight: "900" }, historyEvent: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", marginVertical: 10 }, historyEventText: { color: C.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }, modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.65)" }, sheet: { maxHeight: "88%", backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 }, sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 17 }, sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, rule: { flexDirection: "row", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: C.line }, ruleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#302316", alignItems: "center", justifyContent: "center" }, ruleCopy: { flex: 1 }, ruleBody: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 5 }, outlineBtn: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: C.amber, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 20 }, outlineText: { color: C.gold, fontWeight: "800", fontSize: 14 } });