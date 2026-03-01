import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import toast from 'react-hot-toast'
import { Sparkles, ListChecks } from 'lucide-react'
import { api } from '../api/client'
import styles from './Notes.module.css'

export interface Note {
  noteId: string
  userId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  flashcards?: FlashCard[]
}

export interface FlashCard {
  id: string
  question: string
  answer: string
  type: 'flashcard' | 'qa'
}

const STORAGE_CARDS_KEY = 'notes_saved_cards'

function getStorageKey(noteId: string) {
  return `${STORAGE_CARDS_KEY}_${noteId}`
}

export type SavedCardsByType = { flashcard?: FlashCard[]; qa?: FlashCard[] }

function getSavedCardsForNote(noteId: string): SavedCardsByType {
  try {
    const raw = localStorage.getItem(getStorageKey(noteId))
    if (raw) return JSON.parse(raw) as SavedCardsByType
  } catch {}
  return {}
}

function saveCardsForNote(noteId: string, type: 'flashcard' | 'qa', cards: FlashCard[]) {
  const existing = getSavedCardsForNote(noteId)
  const next = { ...existing, [type]: cards }
  localStorage.setItem(getStorageKey(noteId), JSON.stringify(next))
}

function clearSavedCardsForNote(noteId: string) {
  localStorage.removeItem(getStorageKey(noteId))
}

function NotesEditor({
  content,
  onChange,
  placeholder,
}: {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder || 'Write your note...' }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: styles.editorProse,
      },
    },
  })
  return <EditorContent editor={editor} className={styles.editor} />
}

export default function Notes() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [showFlashcards, setShowFlashcards] = useState<FlashCard[] | null>(null)
  const [flipIndex, setFlipIndex] = useState(0)
  const queryClient = useQueryClient()

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data } = await api.get<Note[]>('/api/notes')
      return data
    },
  })

  const createNote = useMutation({
    mutationFn: async (payload: { title: string; content: string }) => {
      const { data } = await api.post<Note>('/api/notes', payload)
      return data
    },
    onSuccess: (newNote) => {
      queryClient.setQueryData<Note[]>(['notes'], (old) => (old ? [newNote, ...old] : [newNote]))
      setSelectedId(newNote.noteId)
      setTitle(newNote.title)
      setContent(newNote.content)
      toast.success('Note created')
    },
    onError: () => toast.error('Failed to create note'),
  })

  const updateNote = useMutation({
    mutationFn: async ({ noteId, title, content }: { noteId: string; title: string; content: string }) => {
      await api.put(`/api/notes/${noteId}`, { title, content })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Saved')
    },
    onError: () => toast.error('Failed to save'),
  })

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      await api.delete(`/api/notes/${noteId}`)
    },
    onSuccess: (_, noteId) => {
      clearSavedCardsForNote(noteId)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (selectedId === noteId) {
        setSelectedId(null)
        setTitle('')
        setContent('')
        setShowFlashcards(null)
      }
      toast.success('Deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const generateFlashcards = useMutation({
    mutationFn: async ({ noteId, type }: { noteId: string; type: 'flashcard' | 'qa' }) => {
      const { data } = await api.post<{ cards: FlashCard[] }>(`/api/notes/${noteId}/generate-cards`, { type })
      return data.cards
    },
    onSuccess: (cards, { noteId, type }) => {
      saveCardsForNote(noteId, type, cards)
      setShowFlashcards(cards)
      setFlipIndex(0)
      toast.success(type === 'qa' ? 'Q&A created and saved' : 'Flash cards created and saved')
    },
    onError: () => toast.error('Failed to generate flash cards. Check AI service.'),
  })


  const handleNew = () => {
    setSelectedId(null)
    setTitle('')
    setContent('')
  }

  const handleSelect = (n: Note) => {
    setSelectedId(n.noteId)
    setTitle(n.title)
    setContent(n.content)
    setShowFlashcards(null)
  }

  const handleSave = () => {
    if (selectedId) {
      updateNote.mutate({ noteId: selectedId, title, content })
    } else if (title.trim() || content.trim()) {
      createNote.mutate({ title: title.trim() || 'Untitled', content })
    }
  }

  const handleGenerate = (type: 'flashcard' | 'qa') => {
    if (selectedId) generateFlashcards.mutate({ noteId: selectedId, type })
    else toast.error('Save the note before generating flash cards')
  }

  const handleViewSaved = (type: 'flashcard' | 'qa') => {
    if (!selectedId) return
    const saved = getSavedCardsForNote(selectedId)
    const cards = type === 'qa' ? saved.qa : saved.flashcard
    if (cards?.length) {
      setShowFlashcards(cards)
      setFlipIndex(0)
    }
  }

  const savedForNote = selectedId ? getSavedCardsForNote(selectedId) : {}
  const hasSavedFlashcards = (savedForNote.flashcard?.length ?? 0) > 0
  const hasSavedQA = (savedForNote.qa?.length ?? 0) > 0

  if (isLoading) return <div className={styles.loading}>Loading...</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Notes & Flash cards</h1>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <button type="button" className={styles.newBtn} onClick={handleNew}>
            + New note
          </button>
          <ul className={styles.noteList}>
            {notes.map((n) => (
              <li
                key={n.noteId}
                className={selectedId === n.noteId ? styles.noteActive : ''}
                onClick={() => handleSelect(n)}
              >
                {n.title || 'Untitled'}
              </li>
            ))}
          </ul>
        </aside>
        <div className={styles.editorArea}>
          {showFlashcards ? (
            <div className={styles.flashcardView}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setShowFlashcards(null)}
              >
                ← Back to notes
              </button>
              <div className={styles.cardStack}>
                {showFlashcards[flipIndex] && (
                  <div className={styles.card}>
                    <p className={styles.cardLabel}>
                      {showFlashcards[flipIndex].type === 'qa' ? 'Question' : 'Card'}
                    </p>
                    <p className={styles.cardQ}>{showFlashcards[flipIndex].question}</p>
                    <p className={styles.cardLabel}>Answer</p>
                    <p className={styles.cardA}>{showFlashcards[flipIndex].answer}</p>
                  </div>
                )}
              </div>
              <div className={styles.cardNav}>
                <button
                  type="button"
                  disabled={flipIndex <= 0}
                  onClick={() => setFlipIndex((i) => i - 1)}
                >
                  Previous
                </button>
                <span>
                  {flipIndex + 1} / {showFlashcards.length}
                </span>
                <button
                  type="button"
                  disabled={flipIndex >= showFlashcards.length - 1}
                  onClick={() => setFlipIndex((i) => i + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.toolbar}>
                <input
                  className={styles.titleInput}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title"
                />
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.genBtn}
                    onClick={() => handleGenerate('flashcard')}
                    disabled={generateFlashcards.isPending}
                  >
                    <Sparkles size={18} /> Generate Flash cards
                  </button>
                  <button
                    type="button"
                    className={styles.genBtn}
                    onClick={() => handleGenerate('qa')}
                    disabled={generateFlashcards.isPending}
                  >
                    <ListChecks size={18} /> Generate Q&A
                  </button>
                  {hasSavedFlashcards && (
                    <button
                      type="button"
                      className={styles.viewSavedBtn}
                      onClick={() => handleViewSaved('flashcard')}
                    >
                      View Flash cards ({savedForNote.flashcard!.length})
                    </button>
                  )}
                  {hasSavedQA && (
                    <button
                      type="button"
                      className={styles.viewSavedBtn}
                      onClick={() => handleViewSaved('qa')}
                    >
                      View Q&A ({savedForNote.qa!.length})
                    </button>
                  )}
                  <button type="button" className={styles.saveBtn} onClick={handleSave}>
                    Save
                  </button>
                  {selectedId && (
                    <button
                      type="button"
                      className={styles.delBtn}
                      onClick={() => deleteNote.mutate(selectedId)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <NotesEditor
                key={selectedId ?? 'new'}
                content={content}
                onChange={setContent}
                placeholder="Write your note. Then use AI to generate flash cards or Q&A for review."
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
