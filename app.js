document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
            
            if(btn.dataset.target === 'stats' || btn.dataset.target === 'leaderboard') {
                updateStats();
            }
        });
    });

    // --- JSONBin Configuration ---
    const BIN_ID = '6a3ebe30f5f4af5e293580e5';
    const MASTER_KEY = '$2a$10$SPofQVDTLbGZ3eu2A8nI4OK5KLQwrFCmO.yX4sAA0QntFU8r0xrUS';
    const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    let data = [];
    const trackerList = document.getElementById('tracker-list');
    const todayContainer = document.getElementById('today-container');
    const oldDaysList = document.getElementById('old-days-list');
    const oldDaysWrapper = document.getElementById('old-days-wrapper');
    const trackerDivider = document.getElementById('tracker-divider');
    const addDayBtn = document.getElementById('add-day-btn');

    // UI Loading state
    const setLoading = (isLoading) => {
        if(isLoading) {
            trackerList.style.opacity = '0.5';
            todayContainer.style.opacity = '0.5';
            trackerList.style.pointerEvents = 'none';
            todayContainer.style.pointerEvents = 'none';
            addDayBtn.innerText = 'Syncing...';
            addDayBtn.disabled = true;
        } else {
            trackerList.style.opacity = '1';
            todayContainer.style.opacity = '1';
            trackerList.style.pointerEvents = 'all';
            todayContainer.style.pointerEvents = 'all';
            addDayBtn.innerText = 'Add Next Day';
            addDayBtn.disabled = false;
        }
    };

    // --- Date Generation Logic ---
    const getDaysUntilEndOfMonth = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = today.getDate(); i <= lastDay; i++) {
            const dateObj = new Date(year, month, i);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            days.push(dateStr);
        }
        return days;
    };

    // --- API Calls ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'X-Master-Key': MASTER_KEY,
                    'X-Bin-Meta': 'false' // Returns only the actual data, not metadata
                }
            });
            const json = await response.json();
            
            if (json && json.days && Array.isArray(json.days)) {
                data = json.days;
            } else {
                data = [];
            }
            
            // Auto generate days if perfectly empty
            if(data.length === 0) {
                const dates = getDaysUntilEndOfMonth();
                dates.forEach(dateStr => {
                    data.push({
                        date: dateStr,
                        jebraRead: false, jebraGym: false, jebraStudy: false,
                        memoRead: false, memoGym: false, memoStudy: false
                    });
                });
                await saveDataAPI(data); // Sync default days
            } else {
                renderTracker();
                setLoading(false);
            }
            
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to connect to the cloud. Please check your internet connection.');
            setLoading(false);
        }
    };

    const saveDataAPI = async (newData) => {
        setLoading(true);
        try {
            await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': MASTER_KEY
                },
                body: JSON.stringify({ days: newData })
            });
            data = newData;
            renderTracker();
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Failed to save data. Try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- Scoring ---
    const calculateScore = (read, gym, study) => {
        let count = 0;
        if (read) count++;
        if (gym) count++;
        if (study) count++;
        return count + (count === 3 ? 1 : 0);
    };

    const getScoreClass = (score) => {
        if (score === 4) return 'score-perfect';
        if (score === 2 || score === 3) return 'score-good';
        return 'score-bad';
    };

    // --- Render Daily Tracker ---
    const renderTracker = () => {
        let todayHtml = '';
        let currentMonthHtml = '';
        let oldDaysHtml = '';

        const realToday = new Date();
        realToday.setHours(0,0,0,0);
        const realTodayTime = realToday.getTime();
        const currentMonth = realToday.getMonth();
        const currentYear = realToday.getFullYear();

        data.forEach((day, index) => {
            
            const jebraScore = calculateScore(day.jebraRead, day.jebraGym, day.jebraStudy);
            const memoScore = calculateScore(day.memoRead, day.memoGym, day.memoStudy);
            
            let winnerHtml = '';
            if (jebraScore === 4 && memoScore === 4) {
                winnerHtml = '<span class="winner-badge perfect">🏆 Perfect Day</span>';
            } else if (jebraScore > memoScore) {
                winnerHtml = '<span class="winner-badge jebra">Jebra Won</span>';
            } else if (memoScore > jebraScore) {
                winnerHtml = '<span class="winner-badge memo">Memo Won</span>';
            } else {
                winnerHtml = '<span class="winner-badge">Tie</span>';
            }

            // Determine categorization
            const dayDate = new Date(`${day.date}, ${currentYear}`);
            dayDate.setHours(0,0,0,0);
            const isToday = dayDate.getTime() === realTodayTime;
            const isOldDay = dayDate.getMonth() < currentMonth || dayDate.getFullYear() < currentYear;

            // Generate HTML for the day
            const dayCardHtml = `
                <div class="day-container">
                    <div class="day-header">
                        <div class="day-date">${isToday ? '<span style="color:var(--perfect-green);">🌟 Today: </span>' : ''}${day.date}</div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div class="day-winner">${winnerHtml}</div>
                            <!-- <button class="delete-day-btn btn-danger" data-index="${index}">🗑️ Delete</button> -->
                        </div>
                    </div>
                    <div class="day-cards">
                        <!-- Jebra's Card -->
                        <div class="player-card jebra">
                            <div class="player-header">
                                <div class="player-name">Jebra</div>
                                <div class="score-badge ${getScoreClass(jebraScore)}">${jebraScore}</div>
                            </div>
                            <div class="task-list">
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.jebraReadName || 'Read'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="jebra" data-task="Read" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="jebra" data-task="Read" ${day.jebraRead ? 'checked' : ''}>
                                </label>
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.jebraGymName || 'Gym or any task'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="jebra" data-task="Gym" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="jebra" data-task="Gym" ${day.jebraGym ? 'checked' : ''}>
                                </label>
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.jebraStudyName || 'Study'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="jebra" data-task="Study" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="jebra" data-task="Study" ${day.jebraStudy ? 'checked' : ''}>
                                </label>
                            </div>
                        </div>
                        <!-- Memo's Card -->
                        <div class="player-card memo">
                            <div class="player-header">
                                <div class="player-name">Memo</div>
                                <div class="score-badge ${getScoreClass(memoScore)}">${memoScore}</div>
                            </div>
                            <div class="task-list">
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.memoReadName || 'Read'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="memo" data-task="Read" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="memo" data-task="Read" ${day.memoRead ? 'checked' : ''}>
                                </label>
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.memoGymName || 'Gym or any task'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="memo" data-task="Gym" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="memo" data-task="Gym" ${day.memoGym ? 'checked' : ''}>
                                </label>
                                <label class="task-item">
                                    <div class="task-name-wrapper" style="display: flex; align-items: center;">
                                        <span class="task-name-text">${day.memoStudyName || 'Study'}</span>
                                        <button class="edit-task-btn" data-index="${index}" data-user="memo" data-task="Study" style="background: none; border: none; cursor: pointer; margin-left: 8px; font-size: 0.9rem;">✏️</button>
                                    </div>
                                    <input type="checkbox" class="task-cb" data-index="${index}" data-user="memo" data-task="Study" ${day.memoStudy ? 'checked' : ''}>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (isToday) {
                todayHtml += dayCardHtml;
            } else if (isOldDay) {
                oldDaysHtml += dayCardHtml;
            } else {
                currentMonthHtml += dayCardHtml;
            }
        });

        // Render into DOM
        todayContainer.innerHTML = todayHtml;
        trackerList.innerHTML = currentMonthHtml;
        oldDaysList.innerHTML = oldDaysHtml;

        // Show/Hide sections conditionally
        trackerDivider.style.display = (todayHtml !== '' && currentMonthHtml !== '') ? 'block' : 'none';
        oldDaysWrapper.style.display = oldDaysHtml !== '' ? 'block' : 'none';

        // Attach events to checkboxes
        document.querySelectorAll('.task-cb').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const index = e.target.dataset.index;
                const user = e.target.dataset.user;
                const task = e.target.dataset.task;
                
                // create a deep copy to mutate
                const newData = JSON.parse(JSON.stringify(data));
                newData[index][`${user}${task}`] = e.target.checked;
                saveDataAPI(newData);
            });
        });

        // Attach events to delete buttons
        document.querySelectorAll('.delete-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnElement = e.target.closest('.delete-day-btn');
                const index = btnElement.dataset.index;
                if (confirm(`Are you sure you want to delete ${data[index].date}?`)) {
                    const newData = JSON.parse(JSON.stringify(data));
                    newData.splice(index, 1);
                    saveDataAPI(newData);
                }
            });
        });

        // Attach events to edit task buttons
        document.querySelectorAll('.edit-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // prevents label default checkbox toggle
                
                const index = e.currentTarget.dataset.index;
                const user = e.currentTarget.dataset.user;
                const task = e.currentTarget.dataset.task;
                const taskNameKey = `${user}${task}Name`;
                
                const wrapper = e.currentTarget.closest('.task-name-wrapper');
                
                let defaultName = 'Gym or any task';
                if(task === 'Read') defaultName = 'Read';
                if(task === 'Study') defaultName = 'Study';
                
                const currentName = data[index][taskNameKey] || defaultName;
                
                wrapper.innerHTML = `
                    <input type="text" class="edit-task-input" value="${currentName}" style="width: 100px; padding: 2px 4px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: white;">
                    <button class="save-task-btn btn-primary" style="padding: 2px 6px; font-size: 0.8rem; margin-left: 5px;">Save</button>
                `;
                
                // Prevent checkbox toggle when clicking inside the input
                wrapper.querySelector('.edit-task-input').addEventListener('click', (ev) => ev.preventDefault());
                
                wrapper.querySelector('.save-task-btn').addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const newName = wrapper.querySelector('.edit-task-input').value;
                    if(newName.trim() !== '') {
                        const newData = JSON.parse(JSON.stringify(data));
                        newData[index][taskNameKey] = newName.trim();
                        saveDataAPI(newData);
                    }
                });
            });
        });
    };

    addDayBtn.addEventListener('click', () => {
        let nextDateStr = `Day ${data.length + 1}`;
        if (data.length > 0) {
            const lastDateStr = data[data.length - 1].date;
            const lastDate = new Date(`${lastDateStr}, ${new Date().getFullYear()}`);
            if (!isNaN(lastDate.getTime())) {
                lastDate.setDate(lastDate.getDate() + 1);
                nextDateStr = lastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }
        } else {
            nextDateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

        const newData = JSON.parse(JSON.stringify(data));
        newData.push({
            date: nextDateStr,
            jebraRead: false, jebraGym: false, jebraStudy: false,
            memoRead: false, memoGym: false, memoStudy: false
        });
        saveDataAPI(newData);
    });

    // --- Statistics & Leaderboard ---
    const updateStats = () => {
        let jebraTotal = 0, memoTotal = 0;
        let jebraFull = 0, memoFull = 0;
        let days = data.length;

        data.forEach(day => {
            const jScore = calculateScore(day.jebraRead, day.jebraGym, day.jebraStudy);
            const mScore = calculateScore(day.memoRead, day.memoGym, day.memoStudy);
            
            jebraTotal += jScore;
            memoTotal += mScore;
            
            if(jScore === 4) jebraFull++;
            if(mScore === 4) memoFull++;
        });

        const maxPossible = days * 4;
        const jebraCommit = days ? Math.round((jebraTotal / maxPossible) * 100) : 0;
        const memoCommit = days ? Math.round((memoTotal / maxPossible) * 100) : 0;

        document.getElementById('jebra-total').innerText = jebraTotal;
        document.getElementById('jebra-full').innerText = jebraFull;
        document.getElementById('jebra-commit').innerText = `${jebraCommit}%`;

        document.getElementById('memo-total').innerText = memoTotal;
        document.getElementById('memo-full').innerText = memoFull;
        document.getElementById('memo-commit').innerText = `${memoCommit}%`;

        const leaderboardData = [
            { name: 'Jebra', total: jebraTotal, full: jebraFull, commit: jebraCommit },
            { name: 'Memo', total: memoTotal, full: memoFull, commit: memoCommit }
        ].sort((a, b) => b.total - a.total);

        const lbBody = document.getElementById('leaderboard-body');
        lbBody.innerHTML = leaderboardData.map((player, idx) => `
            <tr>
                <td class="rank-${idx + 1}">#${idx + 1}</td>
                <td><strong>${player.name}</strong></td>
                <td>${player.total}</td>
                <td>${player.full}</td>
                <td>${player.commit}%</td>
            </tr>
        `).join('');
    };

    // --- Settings Dropdown ---
    const settingsBtn = document.querySelector('.settings-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    
    if (settingsBtn && dropdownContent) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings-dropdown')) {
                dropdownContent.classList.remove('show');
            }
        });
    }

    // --- Clear Cache ---
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear cache and force reload? This will fetch the latest updates.')) {
                // Append a timestamp to the URL to bypass browser cache
                window.location.href = window.location.href.split('?')[0] + '?v=' + new Date().getTime();
            }
        });
    }

    // --- Initialization ---
    // Start by fetching data from the cloud
    fetchData();
});
