package com.nikhilsi.tourgraph.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nikhilsi.tourgraph.data.DatabaseService
import com.nikhilsi.tourgraph.data.TimezoneHelper
import com.nikhilsi.tourgraph.data.TourEnrichmentService
import com.nikhilsi.tourgraph.model.Chain
import com.nikhilsi.tourgraph.model.SuperlativeResult
import com.nikhilsi.tourgraph.model.SuperlativeType
import com.nikhilsi.tourgraph.model.Tour
import com.nikhilsi.tourgraph.state.AppSettings
import com.nikhilsi.tourgraph.state.Favorites
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class TourGraphViewModel(application: Application) : AndroidViewModel(application) {

    val settings = AppSettings(application)
    val favorites = Favorites(application)

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _loadError = MutableStateFlow<String?>(null)
    val loadError: StateFlow<String?> = _loadError.asStateFlow()

    lateinit var db: DatabaseService
        private set
    lateinit var enrichmentService: TourEnrichmentService
        private set

    // --- Roulette State ---
    private val _currentTour = MutableStateFlow<Tour?>(null)
    val currentTour: StateFlow<Tour?> = _currentTour.asStateFlow()

    private val _rouletteLoading = MutableStateFlow(false)
    val rouletteLoading: StateFlow<Boolean> = _rouletteLoading.asStateFlow()

    private var hand: List<Tour> = emptyList()
    private var handIndex = 0
    private val seenIds = mutableListOf<Int>()

    // --- Right Now State ---
    data class RightNowMoment(
        val tour: Tour,
        val timezoneInfo: TimezoneHelper.TimezoneInfo
    )

    private val _rightNowMoments = MutableStateFlow<List<RightNowMoment>>(emptyList())
    val rightNowMoments: StateFlow<List<RightNowMoment>> = _rightNowMoments.asStateFlow()

    private val _rightNowLoading = MutableStateFlow(false)
    val rightNowLoading: StateFlow<Boolean> = _rightNowLoading.asStateFlow()

    // --- World's Most State ---
    private val _superlatives = MutableStateFlow<List<SuperlativeResult>>(emptyList())
    val superlatives: StateFlow<List<SuperlativeResult>> = _superlatives.asStateFlow()

    private val _worldsMostLoading = MutableStateFlow(false)
    val worldsMostLoading: StateFlow<Boolean> = _worldsMostLoading.asStateFlow()

    // --- Six Degrees State ---
    private val _currentChain = MutableStateFlow<Chain?>(null)
    val currentChain: StateFlow<Chain?> = _currentChain.asStateFlow()

    private val _chainTours = MutableStateFlow<Map<Int, Tour>>(emptyMap())
    val chainTours: StateFlow<Map<Int, Tour>> = _chainTours.asStateFlow()

    private val _sixDegreesLoading = MutableStateFlow(false)
    val sixDegreesLoading: StateFlow<Boolean> = _sixDegreesLoading.asStateFlow()

    // --- Tour Detail State ---
    private val _detailTour = MutableStateFlow<Tour?>(null)
    val detailTour: StateFlow<Tour?> = _detailTour.asStateFlow()

    private val _showTourDetail = MutableStateFlow(false)
    val showTourDetail: StateFlow<Boolean> = _showTourDetail.asStateFlow()

    init {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    db = DatabaseService(application)
                }
                enrichmentService = TourEnrichmentService(db)
                _isLoading.value = false
                fetchRouletteHand()
            } catch (e: Exception) {
                _loadError.value = e.message
                _isLoading.value = false
            }
        }
    }

    // --- Roulette ---

    fun spin() {
        if (hand.isEmpty()) return
        handIndex++
        if (handIndex >= hand.size) {
            fetchRouletteHand()
            return
        }
        val tour = hand[handIndex]
        seenIds.add(tour.id)
        _currentTour.value = tour
    }

    fun fetchRouletteHand() {
        viewModelScope.launch {
            val isFirst = hand.isEmpty()
            if (isFirst) _rouletteLoading.value = true
            val newHand = withContext(Dispatchers.IO) {
                db.getRouletteHand(seenIds.takeLast(200))
            }
            hand = newHand
            handIndex = 0
            if (newHand.isNotEmpty()) {
                seenIds.add(newHand[0].id)
                _currentTour.value = newHand[0]
            }
            if (isFirst) _rouletteLoading.value = false
        }
    }

    // --- Right Now ---

    fun loadRightNow() {
        viewModelScope.launch {
            _rightNowLoading.value = true
            val moments = withContext(Dispatchers.IO) {
                val allTimezones = db.getDistinctTimezones()
                var goldenTzs = TimezoneHelper.getGoldenHourTimezones(allTimezones)
                if (goldenTzs.size < 6) {
                    goldenTzs = goldenTzs + TimezoneHelper.getPleasantTimezones(allTimezones)
                }
                goldenTzs.take(6).mapNotNull { tzInfo ->
                    db.getTourByTimezone(tzInfo.timezone)?.let { tour ->
                        RightNowMoment(tour, tzInfo)
                    }
                }
            }
            _rightNowMoments.value = moments
            _rightNowLoading.value = false
        }
    }

    // --- World's Most ---

    fun loadSuperlatives() {
        viewModelScope.launch {
            _worldsMostLoading.value = true
            val results = withContext(Dispatchers.IO) {
                SuperlativeType.entries.mapNotNull { type ->
                    db.getSuperlative(type)?.let { tour ->
                        SuperlativeResult(type, tour)
                    }
                }
            }
            _superlatives.value = results
            _worldsMostLoading.value = false
        }
    }

    // --- Six Degrees ---

    fun loadRandomChain() {
        viewModelScope.launch {
            _sixDegreesLoading.value = true
            val chain = withContext(Dispatchers.IO) { db.getRandomChain() }
            _currentChain.value = chain
            if (chain != null) {
                val tourIds = chain.links.map { it.tourId }
                val tours = withContext(Dispatchers.IO) { db.getToursByIds(tourIds) }
                _chainTours.value = tours
            }
            _sixDegreesLoading.value = false
        }
    }

    // --- Tour Detail ---

    fun openTourDetail(tourId: Int) {
        viewModelScope.launch {
            val tour = withContext(Dispatchers.IO) { db.getTourById(tourId) }
            _detailTour.value = tour
            _showTourDetail.value = true
            if (tour != null && db.needsEnrichment(tour)) {
                enrichmentService.enrichTour(tourId)
                val refreshed = withContext(Dispatchers.IO) { db.getTourById(tourId) }
                if (refreshed != null) _detailTour.value = refreshed
            }
        }
    }

    fun closeTourDetail() {
        _showTourDetail.value = false
        _detailTour.value = null
    }

    // --- Stats ---

    fun getTourCount(): Int = if (::db.isInitialized) db.getTourCount() else 0
    fun getDestinationCount(): Int = if (::db.isInitialized) db.getDestinationCount() else 0
    fun getChainCount(): Int = if (::db.isInitialized) db.getChainCount() else 0

    override fun onCleared() {
        super.onCleared()
        if (::db.isInitialized) db.close()
    }
}
