import { useLiveQuery } from '../hooks/useLiveQuery';
import Layout from '../components/Layout';
import { db } from '../db/schema';
import { formatDate } from '../utils/calculations';

export default function Notes() {
  const notesData = useLiveQuery(async () => {
    const notes = await db.notes.toArray();
    const sessions = await db.sessions.toArray();
    const locations = await db.locations.toArray();

    const sessionMap = new Map(sessions.map(s => [s.session_id!, s]));
    const locationMap = new Map(locations.map(l => [l.location_id!, l.location]));

    return notes.map(note => {
      const session = sessionMap.get(note.session_id);
      return {
        ...note,
        sessionDate: session ? session.start : 0,
        locationName: session ? locationMap.get(session.location) || 'Unknown' : 'Unknown'
      };
    }).sort((a, b) => b.sessionDate - a.sessionDate);
  });

  return (
    <Layout title="Notes">
      <div className="px-4 py-4">
        {!notesData || notesData.length === 0 ? (
          <div className="text-center text-theme-secondary py-8">
            No notes found. Add notes to sessions from the History page.
          </div>
        ) : (
          <div className="space-y-3">
            {notesData.map(note => (
              <div
                key={note.note_id}
                className="border border-theme rounded p-3 bg-card"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-theme">{note.locationName}</div>
                  <div className="text-sm text-theme-secondary">
                    {formatDate(note.sessionDate)}
                  </div>
                </div>
                <p className="text-theme-secondary whitespace-pre-wrap">{note.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
