<?php
declare(strict_types=1);

require_once __DIR__ . '/TestTypeProfile.php';
require_once __DIR__ . '/../validate.php';

// 絶対音感テスト(本番60問、強制終了あり)。
final class AbsolutePitchProfile implements TestTypeProfile
{
    private const TOTAL_QUESTIONS = 60;
    private const SESSION_STATUSES = ['completed', 'forced_termination', 'interrupted'];
    private const PHASES = ['practice', 'test'];
    private const OUTCOMES = ['correct', 'incorrect', 'timeout', 'interrupted'];

    public function filePrefix(): string
    {
        return 'AP';
    }

    public function responseDetailHeaders(): array
    {
        return [
            'participant_id', 'session_id', 'test_type', 'phase', 'session_status',
            'session_started_at', 'session_ended_at',
            'question_number', 'stimulus_number', 'stimulus_note', 'stimulus_filename',
            'stimulus_started_at', 'correct_response', 'response_note', 'response_at',
            'response_time_ms', 'outcome', 'incorrect_total_after_question',
            'sequence_start_position', 'sequence_start_number', 'sequence_direction',
        ];
    }

    public function sessionHistoryHeaders(): array
    {
        return [
            'participant_id', 'session_id', 'test_type', 'started_at', 'ended_at', 'session_status',
            'practice_questions_presented', 'practice_timeout_count', 'questions_presented',
            'correct_count', 'incorrect_answer_count', 'timeout_count', 'total_incorrect_count',
            'unpresented_count', 'sequence_start_position', 'sequence_start_number',
            'sequence_direction', 'interrupted_phase', 'interrupted_question_number',
        ];
    }

    public function validateSessionPayload(array $session): array
    {
        $errors = validate_session_envelope(
            $session,
            ['sessionId', 'testType', 'startedAt', 'endedAt', 'sessionStatus', 'responses'],
            self::SESSION_STATUSES
        );
        if (!empty($errors) || !is_array($session['responses'])) {
            return $errors;
        }
        foreach (['sequenceStartPosition', 'sequenceStartNumber', 'sequenceDirection'] as $field) {
            if (isset($session[$field]) && is_array($session[$field])) {
                $errors[] = "{$field} must be a scalar or null";
            }
        }
        return array_merge($errors, validate_response_items(
            $session['responses'],
            ['phase', 'questionNumber', 'stimulusNumber', 'stimulusNote', 'stimulusFilename',
                'stimulusStartedAt', 'correctResponse', 'outcome'],
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
            'session_status' => $session['sessionStatus'],
            'session_started_at' => $session['startedAt'],
            'session_ended_at' => $session['endedAt'],
        ];

        $rows = [];
        foreach ($session['responses'] as $r) {
            $isTest = ($r['phase'] ?? '') === 'test';
            $rows[] = $sessionColumns + [
                'phase' => $r['phase'] ?? '',
                'question_number' => $r['questionNumber'] ?? '',
                'stimulus_number' => $r['stimulusNumber'] ?? '',
                'stimulus_note' => $r['stimulusNote'] ?? '',
                'stimulus_filename' => $r['stimulusFilename'] ?? '',
                'stimulus_started_at' => $r['stimulusStartedAt'] ?? '',
                'correct_response' => $r['correctResponse'] ?? '',
                'response_note' => $r['responseNote'] ?? '',
                'response_at' => $r['responseAt'] ?? '',
                'response_time_ms' => $r['responseTimeMs'] ?? '',
                'outcome' => $r['outcome'] ?? '',
                // 練習行では空欄にする(仕様23.2)。
                'incorrect_total_after_question' => $isTest ? ($r['incorrectTotalAfterQuestion'] ?? '') : '',
                'sequence_start_position' => $isTest ? ($session['sequenceStartPosition'] ?? '') : '',
                'sequence_start_number' => $isTest ? ($session['sequenceStartNumber'] ?? '') : '',
                'sequence_direction' => $isTest ? ($session['sequenceDirection'] ?? '') : '',
            ];
        }
        if (empty($rows)) {
            // 1問も始まらないうちに終了・中断したセッション。集計側はphaseが空の行を無視する。
            $rows[] = $sessionColumns;
        }
        return $rows;
    }

    public function summarizeSessionRows(array $rows): array
    {
        $first = $rows[0] ?? [];
        $testRows = array_values(array_filter($rows, fn ($r) => $r['phase'] === 'test'));
        $practiceRows = array_values(array_filter($rows, fn ($r) => $r['phase'] === 'practice'));

        $count = fn (array $list, string $outcome): int => count(array_filter($list, fn ($r) => $r['outcome'] === $outcome));
        $incorrectAnswerCount = $count($testRows, 'incorrect');
        $timeoutCount = $count($testRows, 'timeout');

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
            'sessionStatus' => $first['session_status'] ?? '',
            'startedAt' => $first['session_started_at'] ?? '',
            'endedAt' => $first['session_ended_at'] ?? '',
            'correctCount' => $count($testRows, 'correct'),
            'incorrectAnswerCount' => $incorrectAnswerCount,
            'timeoutCount' => $timeoutCount,
            'totalIncorrectCount' => $incorrectAnswerCount + $timeoutCount,
            'practiceQuestionsPresented' => count($practiceRows),
            'practiceTimeoutCount' => $count($practiceRows, 'timeout'),
            'questionsPresented' => count($testRows),
            'unpresentedCount' => self::TOTAL_QUESTIONS - count($testRows),
            'sequenceStartPosition' => $testRows[0]['sequence_start_position'] ?? '',
            'sequenceStartNumber' => $testRows[0]['sequence_start_number'] ?? '',
            'sequenceDirection' => $testRows[0]['sequence_direction'] ?? '',
            'interruptedPhase' => $interruptedRow['phase'] ?? '',
            'interruptedQuestionNumber' => $interruptedRow['question_number'] ?? '',
        ];
    }

    public function buildSessionHistoryRow(array $summary): array
    {
        return [
            'participant_id' => $summary['participantId'],
            'session_id' => $summary['sessionId'],
            'test_type' => $summary['testType'],
            'started_at' => $summary['startedAt'],
            'ended_at' => $summary['endedAt'],
            'session_status' => $summary['sessionStatus'],
            'practice_questions_presented' => $summary['practiceQuestionsPresented'],
            'practice_timeout_count' => $summary['practiceTimeoutCount'],
            'questions_presented' => $summary['questionsPresented'],
            'correct_count' => $summary['correctCount'],
            'incorrect_answer_count' => $summary['incorrectAnswerCount'],
            'timeout_count' => $summary['timeoutCount'],
            'total_incorrect_count' => $summary['totalIncorrectCount'],
            'unpresented_count' => $summary['unpresentedCount'],
            'sequence_start_position' => $summary['sequenceStartPosition'],
            'sequence_start_number' => $summary['sequenceStartNumber'],
            'sequence_direction' => $summary['sequenceDirection'],
            'interrupted_phase' => $summary['interruptedPhase'],
            'interrupted_question_number' => $summary['interruptedQuestionNumber'],
        ];
    }
}
