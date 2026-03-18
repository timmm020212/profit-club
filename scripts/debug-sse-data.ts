import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function debugSSEData() {
  try {
    console.log('🔍 Debugging SSE Data Flow...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Date: ${today}\n`);

    // 1. Проверяем данные в БД
    const dbSlots = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
        adminUpdateStatus: workSlots.adminUpdateStatus,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(eq(workSlots.workDate, today))
      .orderBy(workSlots.startTime);

    console.log('📊 Database Data:');
    dbSlots.forEach((slot, index) => {
      console.log(`${index + 1}. ID:${slot.id} | ${slot.masterName} | ${slot.workDate} | ${slot.startTime}-${slot.endTime}`);
      console.log(`   isConfirmed: ${slot.isConfirmed} | adminUpdateStatus: ${slot.adminUpdateStatus || 'undefined'}`);
      
      // Логика отображения
      const adminUpdateStatus = slot.adminUpdateStatus as any;
      let displayStatus = '';
      if (adminUpdateStatus === 'accepted') displayStatus = 'confirmed';
      else if (adminUpdateStatus === 'pending') displayStatus = 'pending';
      else if (adminUpdateStatus === 'rejected') displayStatus = 'rejected';
      else if (slot.isConfirmed) displayStatus = 'confirmed';
      else displayStatus = 'pending';
      
      console.log(`   displayStatus: ${displayStatus}`);
      console.log('');
    });

    // 2. Проверяем SSE endpoint напрямую
    console.log('🌐 Testing SSE endpoint directly...');
    try {
      const sseResponse = await fetch(`http://localhost:3000/api/work-slots-stream`, {
        headers: {
          'Accept': 'text/event-stream',
        },
      });
      
      if (sseResponse.ok) {
        console.log('✅ SSE endpoint is accessible');
        
        // Читаем первые несколько сообщений
        const reader = sseResponse.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = '';
          
          for (let i = 0; i < 5; i++) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log(`📨 SSE Message ${i + 1}:`, data);
                  
                  if (data.type === 'update' && data.data) {
                    console.log(`   📊 SSE Data: ${data.data.length} slots`);
                    data.data.forEach((slot: any, idx: number) => {
                      console.log(`      ${idx + 1}. ID:${slot.id} | ${slot.masterName} | adminUpdateStatus:${slot.adminUpdateStatus}`);
                    });
                  }
                } catch (e) {
                  console.log(`   ❌ Parse error: ${line}`);
                }
              }
            }
          }
        }
      } else {
        console.log('❌ SSE endpoint error:', sseResponse.status);
      }
    } catch (error) {
      console.log('❌ SSE endpoint error:', error);
    }

    // 3. Проверяем admin API
    console.log('\n🔍 Testing admin API...');
    try {
      const adminResponse = await fetch(`http://localhost:3000/api/work-slots-admin?date=${today}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log(`✅ Admin API: ${adminData.length} slots`);
        adminData.slice(0, 2).forEach((slot: any, idx: number) => {
          console.log(`   ${idx + 1}. ID:${slot.id} | adminUpdateStatus:${slot.adminUpdateStatus}`);
        });
      } else {
        console.log('❌ Admin API error:', adminResponse.status);
      }
    } catch (error) {
      console.log('❌ Admin API error:', error);
    }

  } catch (error) {
    console.error('❌ Error debugging SSE:', error);
  }
}

debugSSEData();
