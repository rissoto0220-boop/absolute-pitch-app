<?php
declare(strict_types=1);

require_once __DIR__ . '/TestTypeProfile.php';
require_once __DIR__ . '/../validate.php';

// 相対音感テスト(簡易版12問・完全版44問、強制終了なし)。
// クライアントの回答詳細CSV列(src/relative-pitch/reports.js)に、セッション履歴を
// 回答詳細CSVだけから再構築するための列(session_started_at, session_ended_at,
// practice_status, total_questions)を加えている。
final class RelativePitchProfile implements TestTypeProfile
{
    private const SESSION_STATUSES = ['completed', 'interrupted'];
    private const TEST_VERSIONS = ['simplified', 'full'];
    private const PRACTICE_STATUSES = ['completed', 'skipped', 'interrupted'];
    private const PHASES = ['practice', 'test'];
    private const OUTCOMES = ['correct', 'incorrect', 'interrupted'];

    public function filePrefix(): string
    {
        return 'RP';
    }

    public function responseDetailHeaders(): array
    {
        return [
            'participant_id', 'session_id', 'test_type', 'test_version', 'phase', 'session_status', 'answer_layout',
            'session_started_at', 'session_ended_at', 'practice_status', 'total_questions',
            'question_number', 'key_block_number', 'key_code', 'cadence_filename', 'reference_note', 'target_note',
            'interval_semitones', 'syllable_code', 'display_label', 'interval_label', 'scale_label',
            'cadence_started_at', 'reference_started_at', 'target_started_at',
            'response_code', 'response_at', 'response_time_ms', 'outcome',
        ];
    }

    public function sessionHistoryHeaders(): array
    {
        return [
            'participant_id', 'session_id', 'test_type', 'test_version', 'started_at', 'ended_at', 'session_status',
            'answer_layout', 'practice_status', 'practice_questions_presented', 'questions_presented',
            'questions_answered', 'correct_count', 'incorrect_count', 'accuracy',
            'interrupted_phase', 'interrupted_question_number',
        ];
    }

    public function validateSessionPayload(array $session): array
    {
        $errors = validate_session_envelope(
            $session,
            ['sessionId', 'testType', 'testVersion', 'startedAt', 'endedAt', 'sessionStatus',
                'answerLayout', 'practiceStatus', 'generatedQuestionOrder', 'responses'],
            self::SESSION_STATUSES
        );
        if (!empty($errors) || !is_array($session['responses'])) {
            return $errors;
        }

        if (!in_array($session['testVersion'], self::TEST_VERSIONS, true)) {
            $errors[] = 'invalid testVersion';
        }
        if (!is_string($session['answerLayout']) || !preg_match('/^[a-z_]{0,32}$/', $session['answerLayout'])) {
            $errors[] = 'invalid answerLayout';
        }
        if ($session['practiceStatus'] !== null && !in_array($session['practiceStatus'], self::PRACTICE_STATUSES, true)) {
            $errors[] = 'invalid practiceStatus';
        }
        if (!is_array($session['generatedQuestionOrder'])) {
            $errors[] = 'generatedQuestionOrder must be an array';
        }

        return array_merge($errors, validate_response_items(
            $session['responses'],
            ['phase', 'questionNumber', 'keyCode', 'cadenceFilename', 'referenceNote', 'targetNote',
                'intervalSemitones', 'syllableCode', 'displayLabel', 'outcome'],
            self::PHASES,
            self::OUTCOMES
        ));
    }

    public function sessionToResponseDetailRows(string $participantId, array $session): array
    {
        $sessionColumns = [
            'participant_id' => $participantId,
            'session_id' => $session['sessionId'],
            'test_type' => $session['testType'],
            'test_version' => $session['testVersion'],
            'session_status' => $session['sessionStatus'],
            'answer_layout' => $session['answerLayout'],
            'session_started_at' => $session['startedAt'],
            'session_ended_at' => $session['endedAt'],
            'practice_status' => $session['practiceStatus'] ?? '',
            'total_questions' => count($session['generatedQuestionOrder']),
        ];

        $rows = [];
        foreach ($session['responses'] as $r) {
            $rows[] = $sessionColumns + [
                'phase' => $r['phase'] ?? '',
                'question_number' => $r['questionNumber'] ?? '',
                'key_block_number' => $r['keyBlockNumber'] ?? '',
                'key_code' => $r['keyCode'] ?? '',
                'cadence_filename' => $r['cadenceFilename'] ?? '',
                'reference_note' => $r['referenceNote'] ?? '',
                'target_note' => $r['targetNote'] ?? '',
                'interval_semitones' => $r['intervalSemitones'] ?? '',
                'syllable_code' => $r['syllableCode'] ?? '',
                'display_label' => $r['displayLabel'] ?? '',
                'interval_label' => $r['intervalLabel'] ?? '',
                'scale_label' => $r['scaleLabel'] ?? '',
                'cadence_started_at' => $r['cadenceStartedAt'] ?? '',
                'reference_started_at' => $r['referenceStartedAt'] ?? '',
                'target_started_at' => $r['targetStartedAt'] ?? '',
                'response_code' => $r['responseCode'] ?? '',
                'response_at' => $r['responseAt'] ?? '',
                'response_time_ms' => $r['responseTimeMs'] ?? '',
                'outcome' => $r['outcome'] ?? '',
            ];
        }
        if (empty($rows)) {
            // 1問も始まらないうちに中断したセッション。集計側はphaseが空の行を無視する。
            $rows[] = $sessionColumns;
        }
        return $rows;
    }

    public function summarizeSessionRows(array $rows): array
    {
        $first = $rows[0] ?? [];
        $testRows = array_values(array_filter($rows, fn ($r) => $r['phase'] === 'test'));
        $practiceRows = array_values(array_filter($rows, fn ($r) => $r['phase'] === 'practice'));

        $correctCount = count(array_filter($testRows, fn ($r) => $r['outcome'] === 'correct'));
        $incorrectCount = count(array_filter($testRows, fn ($r) => $r['outcome'] === 'incorrect'));
        $sessionStatus = $first['session_status'] ?? '';
        $totalQuestions = (int) ($first['total_questions'] ?? 0);

        $interruptedRow = null;
        foreach ($rows as $r) {
            if ($r['outcome'] === 'interrupted') {
                $interruptedRow = $r;
                break;
            }
        }

        return [
            'participantId' => $first['participant_id'] ?? '',
            'sessionId' => $first['session_id'] ?? '',
            'testType' => $first['test_type'] ?? '',
            'testVersion' => $first['test_version'] ?? '',
            'sessionStatus' => $sessionStatus,
            'startedAt' => $first['session_started_at'] ?? '',
            'endedAt' => $first['session_ended_at'] ?? '',
            'answerLayout' => $first['answer_layout'] ?? '',
            'practiceStatus' => $first['practice_status'] ?? '',
            'practiceQuestionsPresented' => count($practiceRows),
            'questionsPresented' => count($testRows),
            'questionsAnswered' => $correctCount + $incorrectCount,
            'correctCount' => $correctCount,
            'incorrectCount' => $incorrectCount,
            'totalQuestions' => $totalQuestions,
            // 正答率は完了したセッションだけが意味を持つ(クライアントreports.jsと同じ)。
            'accuracy' => $sessionStatus === 'completed' && $totalQuestions > 0
                ? $this->accuracy($correctCount, $totalQuestions)
                : '',
            'interruptedPhase' => $interruptedRow['phase'] ?? '',
            'interruptedQuestionNumber' => $interruptedRow['question_number'] ?? '',
        ];
    }

    // クライアントのcalculateAccuracy()(Math.round(x*1000)/10)と同じ丸め。
    private function accuracy(int $correctCount, int $totalQuestions): int|float
    {
        $value = floor($correctCount / $totalQuestions * 1000 + 0.5) / 10;
        return $value == floor($value) ? (int) $value : $value;
    }

    public function buildSessionHistoryRow(array $summary): array
    {
        return [
            'participant_id' => $summary['participantId'],
            'session_id' => $summary['sessionId'],
            'test_type' => $summary['testType'],
            'test_version' => $summary['testVersion'],
            'started_at' => $summary['startedAt'],
            'ended_at' => $summary['endedAt'],
            'session_status' => $summary['sessionStatus'],
            'answer_layout' => $summary['answerLayout'],
            'practice_status' => $summary['practiceStatus'],
            'practice_questions_presented' => $summary['practiceQuestionsPresented'],
            'questions_presented' => $summary['questionsPresented'],
            'questions_answered' => $summary['questionsAnswered'],
            'correct_count' => $summary['correctCount'],
            'incorrect_count' => $summary['incorrectCount'],
            'accuracy' => $summary['accuracy'],
            'interrupted_phase' => $summary['interruptedPhase'],
            'interrupted_question_number' => $summary['interruptedQuestionNumber'],
        ];
    }
}
