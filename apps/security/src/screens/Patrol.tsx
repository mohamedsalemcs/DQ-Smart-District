import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '@dq/core';
import { Card, SectionTitle } from '@dq/ui';
import { Map3D } from '../components/three/DQTwin';
import { Txn } from '@dq/ui';
import { incidentKindAr } from '@dq/core';
import { secondsToClock } from '@dq/core';

export function PatrolScreen() {
  const store = useStore();
  const navigate = useNavigate();
  const activeTasks = store.incidents.filter((i) => i.status === 'dispatched' || i.status === 'on_scene');

  return (
    <div className="space-y-4">
      <SectionTitle sub="مواقع الدوريات حية — تتحرك على النموذج أثناء الجولات والمهام">الدوريات</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-3">
          <Map3D
            layers={{ patrols: true, incidents: true, gates: true }}
            className="aspect-[16/10]"
            onOpen={(link) => {
              if (link.startsWith('incident:')) navigate(`/incidents/${link.slice(9)}`);
              else if (link.startsWith('gate:')) navigate(`/gate/${link.slice(5)}`);
            }}
          />
        </Card>
        <div className="space-y-3">
          {store.patrols.map((p) => {
            const task = activeTasks.find((i) => i.dispatch?.patrolId === p.id);
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{p.nameAr}</p>
                  <span className={`text-caption ${p.status === 'available' ? 'text-ok-600' : 'text-warn-600-600'}`}>
                    {p.status === 'available' ? 'متاحة' : p.status === 'dispatched' ? 'في مهمة' : 'في الموقع'}
                  </span>
                </div>
                <p className="mt-1 text-caption text-ink-500">{store.people.find((x) => x.id === p.guardId)?.nameAr}</p>
                {task && (
                  <Link to={`/incidents/${task.id}`} className="mt-2 block rounded-ctl bg-ink-0 p-2 text-caption hover:bg-ink-50">
                    المهمة: {incidentKindAr[task.kind]} <Txn no={task.txnNo} />
                    {task.dispatch?.responseSeconds != null && <span className="ms-2 text-ok-600">استجابة {secondsToClock(task.dispatch.responseSeconds)}</span>}
                  </Link>
                )}
              </Card>
            );
          })}
          <Card className="p-4 text-caption text-ink-500">
            <p className="mb-1 font-semibold">متوسط زمن الاستجابة (آخر 7 أيام)</p>
            <p className="text-2xl font-bold tabular-nums text-ink-800">05:47</p>
            <p>الهدف التشغيلي: أقل من 08:00</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
