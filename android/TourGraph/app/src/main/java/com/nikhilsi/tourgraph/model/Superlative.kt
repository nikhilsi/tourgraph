package com.nikhilsi.tourgraph.model

enum class SuperlativeType(
    val displayTitle: String,
    val emoji: String,
    val statLabel: String
) {
    MOST_EXPENSIVE("Most Expensive", "\uD83D\uDCB0", "Price"),
    CHEAPEST_5_STAR("Cheapest 5-Star", "\u2B50", "Price"),
    LONGEST("Longest", "\u23F3", "Duration"),
    SHORTEST("Shortest", "\u26A1", "Duration"),
    MOST_REVIEWED("Most Reviewed", "\uD83D\uDDE3\uFE0F", "Reviews"),
    HIDDEN_GEM("Hidden Gem", "\uD83C\uDF1F", "Rating");
}

data class SuperlativeResult(
    val type: SuperlativeType,
    val tour: Tour
)
